import { ACT_SDK_CORE_VERSION } from '@act-sdk/core';

export const ACT_SDK_REACT_VERSION = '0.0.0';

export function getActSdkVersions() {
  return {
    core: ACT_SDK_CORE_VERSION,
    react: ACT_SDK_REACT_VERSION,
  };
}
