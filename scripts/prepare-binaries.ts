import { prepareBundledBinaries } from "../electron/main/services/binaries/prepareBinaries";

const binaryPaths = await prepareBundledBinaries();

console.log("Bundled binaries are ready:");
console.log(JSON.stringify(binaryPaths, null, 2));
