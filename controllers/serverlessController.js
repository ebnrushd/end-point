// controllers/serverlessController.js
const vm = require('node:vm');
const ServerlessFunction = require('../models/ServerlessFunction');
const mongoose = require('mongoose'); // Needed for ObjectId for execution ID

exports.testBuiltInVMExecution = (req, res, next) => {
  const userCode = req.body.code || 'result = contextParam.a + contextParam.b;';
  const userContextParam = req.body.scriptContext || { a: 10, b: 22 };
  const sandbox = {
    contextParam: userContextParam,
    result: undefined,
  };
  try {
    vm.createContext(sandbox);
    const script = new vm.Script(userCode, { filename: 'userScript.js' });
    script.runInContext(sandbox, { timeout: 1000 });
    res.status(200).json({
      success: true,
      message: "node:vm execution successful",
      codeExecuted: userCode,
      scriptContextUsed: userContextParam,
      output: sandbox.result
    });
  } catch (error) {
    console.error("Error executing with node:vm:", error);
    res.status(500).json({
      success: false,
      message: "Error executing code with node:vm",
      error: error.message,
      stack: error.stack ? error.stack.split('\n')[0] : null
    });
  }
};

exports.deployFunction = async (req, res, next) => {
  try {
    const { name, description, code, version, config, envVars } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: 'Function name and code are required.' });
    }
    const processedEnvVars = (envVars && typeof envVars === 'object') ? envVars : {};
    let existingFunction = await ServerlessFunction.findOne({ name: name.toLowerCase() });
    if (existingFunction) {
      if (existingFunction.uploader.toString() !== req.user._id.toString() && !req.user.roles.includes('admin')) {
        return res.status(403).json({ message: 'Forbidden: You do not own this function.' });
      }
      existingFunction.description = description || existingFunction.description;
      existingFunction.code = code;
      existingFunction.version = version || existingFunction.version;
      if (config) {
        existingFunction.config = existingFunction.config || {};
        existingFunction.config = { ...existingFunction.config, ...config };
        existingFunction.markModified('config');
      }
      existingFunction.envVars = processedEnvVars;
      existingFunction.markModified('envVars');
      existingFunction.uploader = req.user._id;
      await existingFunction.save();
      res.status(200).json({
        success: true,
        message: `Function '${name}' updated successfully.`,
        data: existingFunction
      });
    } else {
      const newFunction = new ServerlessFunction({
        name, description, code, version, config,
        envVars: processedEnvVars,
        uploader: req.user._id
      });
      await newFunction.save();
      res.status(201).json({
        success: true,
        message: `Function '${name}' deployed successfully.`,
        data: newFunction
      });
    }
  } catch (error) {
    console.error('Error deploying function:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message, errors: error.errors });
    }
    if (error.code === 11000) {
        return res.status(409).json({ success: false, message: "Function name already exists."});
    }
    res.status(500).json({ message: 'Server error during function deployment.', error: error.message });
  }
};

exports.executeFunction = async (req, res, next) => {
  const functionName = req.params.functionName.toLowerCase();
  const executionContext = req.body.context || {};
  const executionArgs = req.body.args || [];
  const executionId = new mongoose.Types.ObjectId(); // Unique ID for this execution instance

  const capturedLogs = []; // Array to store logs for this execution

  try {
    const funcToExecute = await ServerlessFunction.findOne({ name: functionName });
    if (!funcToExecute) {
      return res.status(404).json({ message: `Function '${functionName}' not found.` });
    }

    let decryptedEnvVars = {};
    if (funcToExecute.envVars && typeof funcToExecute.envVars === 'object') {
        decryptedEnvVars = { ...funcToExecute.envVars }; // Using plain pass-through as per previous step
    }

    const sandboxConsole = {
      log: (...args) => {
        const logMsg = `[${functionName}:${executionId}] LOG: ` + args.map(arg => String(arg)).join(' ');
        console.log(logMsg);
        capturedLogs.push({ level: 'LOG', message: args.map(arg => String(arg)).join(' '), timestamp: new Date() });
      },
      warn: (...args) => {
        const warnMsg = `[${functionName}:${executionId}] WARN: ` + args.map(arg => String(arg)).join(' ');
        console.warn(warnMsg);
        capturedLogs.push({ level: 'WARN', message: args.map(arg => String(arg)).join(' '), timestamp: new Date() });
      },
      error: (...args) => {
        const errorMsg = `[${functionName}:${executionId}] ERROR: ` + args.map(arg => String(arg)).join(' ');
        console.error(errorMsg);
        capturedLogs.push({ level: 'ERROR', message: args.map(arg => String(arg)).join(' '), timestamp: new Date() });
      },
    };

    const sandbox = {
      _executionContext: executionContext,
      _executionArgs: executionArgs,
      _result: undefined,
      env: decryptedEnvVars,
      console: sandboxConsole,
    };
    vm.createContext(sandbox);

    const executionWrapperCode = `
      let userFunction;
      const module = { exports: {} };
      (function(module, exports) {
        ${funcToExecute.code}
      })(module, module.exports);

      if (typeof module.exports === 'function') {
        userFunction = module.exports;
      } else if (typeof handler === 'function') {
        userFunction = handler;
      } else {
        throw new Error('No exported function or global "handler" function found in user code.');
      }
      _result = userFunction(_executionContext, ..._executionArgs);
    `;
    const script = new vm.Script(executionWrapperCode, { filename: `${functionName}.js` });

    const startTime = process.hrtime();
    script.runInContext(sandbox, { timeout: funcToExecute.config.timeout || 3000 });
    const diff = process.hrtime(startTime);
    const executionTimeMs = (diff[0] * 1e3) + (diff[1] * 1e-6);

    res.status(200).json({
      success: true,
      message: `Function '${functionName}' executed successfully.`,
      result: sandbox._result,
      executionId: executionId.toString(),
      executionTime: `${executionTimeMs.toFixed(3)} ms`,
      logs: capturedLogs
    });

  } catch (error) {
    console.error(`[${functionName}:${executionId}] EXECUTION FAILED:`, error.message); // Log error message
    // Avoid logging full error object to console if it might be too verbose or sensitive
    capturedLogs.push({ level: 'FATAL', message: error.message, timestamp: new Date() });

    res.status(500).json({
      success: false,
      message: `Error executing function '${functionName}'.`,
      error: error.message,
      executionId: executionId.toString(),
      logs: capturedLogs
    });
  }
};
