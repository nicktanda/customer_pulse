import { Queue, Worker, type Job } from "bullmq";
import { repeatableSchedules } from "./schedules.js";
import { QUEUE_DEFAULT, QUEUE_MAILERS } from "./queue-names.js";
import { getRedisConnection } from "./redis.js";
import { runJob } from "./job-handlers.js";
import { startBullBoard } from "./bull-board-server.js";

const connection = getRedisConnection();

const queueDefault = new Queue(QUEUE_DEFAULT, { connection });
const queueMailers = new Queue(QUEUE_MAILERS, { connection });

async function registerRepeatables(): Promise<void> {
  for (const s of repeatableSchedules) {
    const q = s.queue === QUEUE_MAILERS ? queueMailers : queueDefault;
    await q.add(
      s.jobName,
      {},
      {
        repeat: { pattern: s.pattern },
        jobId: `repeat:${s.jobName}`,
      },
    );
    console.log(`[worker] registered repeat job=${s.jobName} pattern=${s.pattern} queue=${s.queue}`);
  }
}

function startWorkers(): void {
  const processor = async (job: Job) => {
    await runJob(job);
  };

  new Worker(QUEUE_DEFAULT, processor, { connection });
  new Worker(QUEUE_MAILERS, processor, { connection });
  console.log(`[worker] listening on queues ${QUEUE_DEFAULT}, ${QUEUE_MAILERS}`);
}

async function main(): Promise<void> {
  await registerRepeatables();
  startWorkers();

  const boardPort = Number(process.env.BULL_BOARD_PORT ?? "3002");
  if (!Number.isNaN(boardPort) && boardPort > 0) {
    startBullBoard(boardPort, [queueDefault, queueMailers]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
