import packageMetadata from "../../package.json";

export const healthPayload = () => ({
  service: "pourmed",
  version: packageMetadata.version,
});
