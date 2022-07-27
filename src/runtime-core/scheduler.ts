const queue: any = []

let p = Promise.resolve()
let isFlushPending = false

export function nextTick(fn) {
  return fn ? p.then(fn) : p
}

export function queueJobs(job) {
  if (!queue.includes(job)) {
    queue.push(job)
  }

  queueFlush()
}

function queueFlush() {
  if (isFlushPending) return
  isFlushPending = true

  nextTick(flushJob)
  // Promise.resolve().then(() => {
  //   flushJob()
  // })
}

function flushJob() {
  isFlushPending = false
  let job
  while ((job = queue.shift())) {
    job && job()
  }
}
