'use strict';

const spawn = require('child_process').spawn;
const all = Promise.all.bind(Promise);

/** @type {NodeJS.Signals[]} */
const SIGNALS_TO_EXIT = ['SIGTERM', 'SIGINT'];

module.exports = ({ PARALLELISM_FACTOR, SHUTDOWN_TIMEOUT_SECONDS, CHILD_TERMINATE_TIMEOUT_SECONDS }) => {
  let numPendingChildProcess = 0;
  let processExiting = false;
  const exitHandler = () => {
    processExiting = true;
    console.error(`Waiting ${SHUTDOWN_TIMEOUT_SECONDS} seconds before exiting`);

    const exit = () => {
      console.error('Exiting...');
      process.exit(1);
    };

    // Check to see if all child processes exited
    const checkAndExit = () => {
      if (!numPendingChildProcess) {
        exit();
      } else {
        setImmediate(checkAndExit);
      }
    };
    checkAndExit();

    setTimeout(exit, SHUTDOWN_TIMEOUT_SECONDS * 1000);
  };

  const addHandler = (handler) => {
    SIGNALS_TO_EXIT.forEach((signal) => {
      process.addListener(signal, handler);
    });
  };

  const removeHandler = (handler) => {
    SIGNALS_TO_EXIT.forEach((signal) => {
      process.removeListener(signal, handler);
    });
  };

  return {
    /**
     * Promisify {@code child_process.spawn}.
     *
     * @param runCommand {string[]}
     * @param exitCommand {string[]}
     * @return {Promise<void>} Resolves when process finishes, rejects otherwise.
     */
    async spawnPromisified({ runCommand, exitCommand }) {
      const [command, ...args] = runCommand;

      return new Promise((resolve, reject) => {
        console.log(`Running: ${runCommand}`);
        const childProcess = spawn(command, args);
        let running = true;

        if (!numPendingChildProcess) {
          addHandler(exitHandler);
        }
        numPendingChildProcess++;

        let outData = '';
        childProcess.stdout.on('data', (data) => {
          const nextChunk = String(data);
          outData += nextChunk;
          const newLineIndex = outData.indexOf('\n');
          if (newLineIndex >= 0) {
            console.log(outData.substring(0, newLineIndex));
            outData = outData.substring(newLineIndex + 1);
          }
        });

        let errData = '';
        childProcess.stderr.on('data', (data) => {
          const nextChunk = String(data);
          errData += nextChunk;
          const newLineIndex = errData.indexOf('\n');
          if (newLineIndex >= 0) {
            console.error(errData.substring(0, newLineIndex));
            errData = errData.substring(newLineIndex + 1);
          }
        });

        const killHandler = exitCommand
          ? (signal) => {
              console.log(`Received signal ${signal}, running exit command ${exitCommand}`);
              const [killCommand, ...killArgs] = exitCommand;
              numPendingChildProcess++;
              const exitProcess = spawn(killCommand, killArgs);
              exitProcess.on('close', () => {
                numPendingChildProcess--;
                console.log(`Child process exited`);
              });
            }
          : (signal) => {
              console.log(`Received signal ${signal}, terminating child process`);
              childProcess.kill('SIGTERM');
              console.log(`Sent SIGTERM to child process`);
              setTimeout(() => {
                if (running) {
                  console.log(`Child process not exiting, killing child process`);
                  childProcess.kill('SIGKILL');
                  console.log(`Sent SIGKILL to child process`);
                }
              }, CHILD_TERMINATE_TIMEOUT_SECONDS * 1000);
            };

        childProcess.on('close', (code) => {
          running = false;
          numPendingChildProcess--;
          removeHandler(killHandler);

          if (outData) {
            console.log(outData);
          }
          if (errData) {
            console.error(errData);
          }

          if (!processExiting) {
            if (!code) {
              resolve();
            } else {
              reject(new Error(`Process exited with exit code ${code}`));
            }
          }
        });

        addHandler(killHandler);
      }).then(() => {
        if (!numPendingChildProcess) {
          removeHandler(exitHandler);
        }
      });
    },
    /**
     * Run jobs in batches in parallel. The max number of jobs allowed to run in parallel is specified by {@code PARALLELISM_FACTOR}.
     * All jobs need to finish in a batch before continuing on the next batch.
     *
     * @param collection {Array} Collection to create job from
     * @param promiseFactory {function(any): Promise<void>} The factory that converts each element of the collection into a running Promise.
     * @param ignoreIndividualError {boolean} Only log errors of individual jobs without failing, unless all jobs fail.
     * @return {Promise<void>} Resolves if all jobs succeed; rejects otherwise.
     */
    async runInBatchedParallel(collection, promiseFactory, ignoreIndividualError = false) {
      const numJobs = collection.length;
      let count = 1;
      let failedCount = 0;
      while (collection.length) {
        const executing = [];
        let i = 0;
        while (i < PARALLELISM_FACTOR && collection.length) {
          const nextJobInput = collection.shift();
          const nextJobNumber = count;
          executing.push(
            (async () => {
              console.log(`Running job ${nextJobNumber} of ${numJobs}`);
              try {
                await promiseFactory(nextJobInput);
              } catch (e) {
                if (ignoreIndividualError) {
                  failedCount++;
                  console.error(e);
                } else {
                  throw ignoreIndividualError;
                }
              }
              console.log(`Completed job ${nextJobNumber} of ${numJobs}`);
            })(),
          );
          i++;
          count++;
        }
        await all(executing);
      }
      if (failedCount === numJobs) {
        throw new Error('All jobs failed');
      }
      console.log(`Finished running ${numJobs} jobs`);
    },
  };
};
