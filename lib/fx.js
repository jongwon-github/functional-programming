const add = (a, b) => a + b;

/* curry */
const curry =
  (f) =>
  (a, ..._) =>
    _.length ? f(a, ..._) : (..._) => f(a, ..._);

/* map */
// const map = curry((f, iter) => {
//   let res = [];
//   // for (const a of iter) {
//   //   res.push(f(a));
//   // }
//   iter = iter[Symbol.iterator]();
//   let cur;
//   while (!(cur = iter.next()).done) {
//     const a = cur.value;
//     res.push(f(a));
//   }
//   return res;
// });

/* filter */
// const filter = curry((f, products) => {
//   let res = [];
//   for (const p of products) {
//     if (f(p)) res.push(p);
//   }
//   return res;
// });

const go1 = (a, f) => (a instanceof Promise ? a.then(f) : f(a));

/* reduce */
const reduce = curry((f, acc, iter) => {
  if (!iter) {
    iter = acc[Symbol.iterator]();
    acc = iter.next().value;
  } else {
    iter = iter[Symbol.iterator]();
  }
  return go1(acc, function recur(acc) {
    let cur;
    while (!(cur = iter.next()).done) {
      console.log("cur : ", cur);
      const a = cur.value;
      acc = f(acc, a);
      //acc = acc instanceof Promise ? acc.then((acc) => f(acc, a)) : f(acc, a);
      if (acc instanceof Promise) return acc.then(recur);
    }
    return acc;
  });
});

/* go */
const go = (...args) => reduce((a, f) => f(a), args);

/* pipe */
const pipe =
  (f, ...fs) =>
  (...as) =>
    go(f(...as), ...fs);

/* 
  range 실행 시에 while문이 실행되고 배열을 return 한다.
  그리고 reduce 실행 시에도 내부적으로 acc[Symbol.iterator]()를 통해 이터레이터를 만드는 로직을 수행할 때 
  배열에서 이터레이터로 변환 작업 필요
*/
const range = (l) => {
  let i = -1;
  let res = [];
  while (++i < l) {
    res.push(i);
  }
  return res;
};

/* 
  느긋한 L.range 
  L.range 실행 시에는 실제로 while문이 실행되지 않는다.
  reduce 실행 시에 while문이 실행됨.
  그리고 reduce 실행 시에도 내부적으로 acc[Symbol.iterator]()를 통해 이터레이터를 만드는 로직 수행할 때
  변환 작업 불필요 
*/
const L = {};
L.range = function* (l) {
  let i = -1;
  while (++i < l) {
    yield i;
  }
};

/* L.map 함수 정의 */
L.map = curry(function* (f, iter) {
  iter = iter[Symbol.iterator]();
  let cur;
  while (!(cur = iter.next()).done) {
    const a = cur.value;
    yield go1(a, f);
  }
});

/* L.filter 함수 정의 */
L.filter = curry(function* (f, iter) {
  iter = iter[Symbol.iterator]();
  let cur;
  while (!(cur = iter.next()).done) {
    const a = cur.value;
    if (f(a)) yield a;
  }
});

/* take 함수 정의 */
const take = curry((l, iter) => {
  let res = [];
  iter = iter[Symbol.iterator]();
  return (function recur() {
    let cur;
    while (!(cur = iter.next()).done) {
      const a = cur.value;
      if (a instanceof Promise) {
        return a.then((a) => {
          res.push(a);
          if (res.length == l) return res;
          return recur();
        });
      }
      res.push(a);
      if (res.length == l) return res;
    }
    return res;
  })();
});

const takeAll = take(Infinity);

/* L.map을 이용한 map */
const map = curry(pipe(L.map, takeAll));

/* L.filter를 이용한 filter */
const filter = curry(pipe(L.filter, takeAll));
