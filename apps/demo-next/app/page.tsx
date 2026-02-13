import { ACT_SDK_CORE_VERSION } from '@act-sdk/core';
import { getActSdkVersions } from '@act-sdk/react';

export default function HomePage() {
  const versions = getActSdkVersions();

  return (
    <main>
      <h1>Act SDK Demo</h1>
      <p>Core package version: {ACT_SDK_CORE_VERSION}</p>
      <p>React package version: {versions.react}</p>
    </main>
  );
}
