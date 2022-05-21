const add = (a, b) => a + b;

/* curry */
const curry =
  (f) =>
  (a, ..._) =>
    _.length ? f(a, ..._) : (..._) => f(a, ..._);

/* map */
const map = curry((f, iter) => {
  let res = [];
  for (const a of iter) {
    res.push(f(a));
  }
  return res;
});

/* filter */
const filter = curry((f, products) => {
  let res = [];
  for (const p of products) {
    if (f(p)) res.push(p);
  }
  return res;
});

/* reduce */
const reduce = curry((f, acc, iter) => {
  if (!iter) {
    iter = acc[Symbol.iterator]();
    acc = iter.next().value;
  }
  for (const n of iter) {
    acc = f(acc, n);
  }
  return acc;
});
