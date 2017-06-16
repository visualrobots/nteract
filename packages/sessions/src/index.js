// @flow

const spawnteract = require("spawnteract");
const kernelspecs = require("kernelspecs");
const enchannel = require("enchannel-zmq-backend");

import { createMessage } from "@nteract/messaging";

import type { spawn } from "child_process";

const uuid = require("uuid");

const fs = require("fs");
const Rx = require("rxjs/Rx");

// Spawn kernel | Load kernel

type ConnectionOptions = {
  connectionJSON: {}
};

function instantiateSession(connectionOptions: ConnectionOptions) {}

function cleanup(kernel) {
  kernel.spawn.kill();
  fs.unlink(kernel.connectionFile, () =>
    console.log("deleted connection file")
  );
}

type SpawnedKernel = {
  spawn: spawn,
  connectionFile: string,
  config: any
};

spawnteract.launch("python3").then((kernel: SpawnedKernel) => {
  const identity = createMessage().header.session;
  console.log("IDENTITY: ", identity);

  const channels = enchannel.createChannels(identity, kernel.config);

  const subs = [
    channels.iopub.subscribe({ next: msg => console.log("IOPUB: ", msg) }),
    channels.shell.subscribe({ next: msg => console.log("SHELL: ", msg) }),
    channels.control.subscribe({ next: msg => console.log("CONTROL: ", msg) }),
    channels.stdin.subscribe({ next: msg => console.log("STDIN: ", msg) })
  ];

  // Returns
  // kernel.spawn <-- The running process, from child_process.spawn(...)
  // kernel.connectionFile <-- Connection file path
  // kernel.config <-- Connection information from the file

  // Print the ip address and port for the shell channel
  console.log(kernel.config.ip + ":" + kernel.config.shell_port);

  const i = setInterval(() => {
    const message = createMessage("kernel_info_request");
    console.log("SENDING", message);
    channels.shell.next(createMessage(message));
  }, 1000);

  setTimeout(() => {
    clearInterval(i);
    cleanup(kernel);
    subs.map(x => x.unsubscribe());
  }, 5000);
});
