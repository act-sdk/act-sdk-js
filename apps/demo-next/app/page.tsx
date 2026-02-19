'use client';

import { createTask } from '@act/core';
import { useActId } from '@act/react';

export default function HomePage() {
  const viewId = useActId('demo');
  const task = createTask('Ship v1');

  return (
    <main>
      <h1>ACT SDK Demo</h1>
      <p>View id: {viewId}</p>
      <p>
        Sample task: {task.title} ({task.id})
      </p>
    </main>
  );
}
