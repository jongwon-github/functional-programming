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

const reduceF = (acc, a, f) =>
  a instanceof Promise
    ? a.then(
        (a) => f(acc, a),
        (e) => (e == nop ? acc : Promise.reject(e))
      )
    : f(acc, a);

const head = (iter) => go1(take(1, iter), ([h]) => h);

/* reduce */
const reduce = curry((f, acc, iter) => {
  if (!iter) return reduce(f, head((iter = acc[Symbol.iterator]())), iter);
  iter = iter[Symbol.iterator]();
  // 아래 방식으로도 비동기처리가 가능하지만 최초로 비동기값이 처리된 이후에 나머지 모든 처리가 비동기로 이루어지기 때문에 문제가 발생할 수 있음
  // let cur;
  // while (!(cur = iter.next()).done) {
  //   const a = cur.value;
  //   acc = acc instanceof Promise ? acc.then((acc) => f(acc, a)) : f(acc, a);
  // }
  // reduce 함수에 사용되는 초기값(첫 번째 acc 값)이 비동기값인 경우 이를 처리하기 위해 go1 함수 
  return go1(acc, function recur(acc) {
    let cur;
    while (!(cur = iter.next()).done) {
      acc = reduceF(acc, cur.value, f);
      // 이 부분에서 'return' 을 해주는 이유는 연산 중에 비동기(Promise) 연산이 발생할 경우, 이 후 연산은 비동기로 처리가 되기 때문에 의도하지 않은 상황이 발생할 수 있음 
      // 따라서 동기로 연산 진행을 하기 위해서 'return' 을 해줌 
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

const nop = Symbol("nop");

/* L.filter 함수 정의 */
L.filter = curry(function* (f, iter) {
  for (const a of iter) {
    const b = go1(a, f);
    if (b instanceof Promise)
      // 아무 일도 하지 않길 바라는 reject 인지, error 로 인한 reject 인지를 구분하기 위해 nop 을 사용
      // nop 값이 reject 되는 경우는 'a' 값이 f함수(filter 함수)를 만족하지 않는다는 것을 의미
      yield b.then((b) => (b ? a : Promise.reject(nop)));
    else if (b) yield a;
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
        return a
          .then((a) => ((res.push(a), res).length == l ? res : recur()))
          // error == nop : filter 함수를 만족하지 않는 경우이며 아무 처리없이 다음 순회를 지속함  
          // error !== nop : 의도하지 않은 오류인 경우이고 이때는 해당 오류를 발생 시킴
          .catch((e) => (e == nop ? recur() : Promise.reject(e)));
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
