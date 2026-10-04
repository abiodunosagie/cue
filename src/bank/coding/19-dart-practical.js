// Practical Dart tasks from Flutter interviews: async code, models, small
// utilities. Dart only. Each has its own test and Run it code (top-level
// functions and classes, no Solution wrapper).
function dart(id, title, level, statement, signature, asks, idea, steps, code, check, complexity, verify, run, expected) {
  return {
    id, title, level, statement, signature: { dart: signature }, asks, idea,
    where: { dart: 'a new Dart file, or below the existing code, as top-level code.' },
    steps, code: { dart: code }, check, complexity,
    tests: [{ args: [], expected }],
    verify: { dart: verify }, run: { dart: run }
  };
}

module.exports = [
  dart('dart-json-models', 'Parse JSON into Dart Models', 'easy',
    'Given a JSON string of a list of users, each with id (int), name (String), email (String, may be missing) and roles (list of strings), write a User class with a fromJson factory and a function parseUsers(String body) that returns List<User>. ' +
      'Missing email becomes null and missing roles an empty list. Example: \'[{"id":1,"name":"Ada","roles":["admin"]}]\' gives one User with id 1, name Ada, email null and roles [admin].',
    'class User { final int id; final String name; final String? email; final List<String> roles; factory User.fromJson(Map<String, dynamic> json) } List<User> parseUsers(String body)',
    'Turn a JSON response into typed Dart objects, handling missing fields safely.',
    'Decode the string with jsonDecode, cast it to a list, and map each element through a fromJson factory. The factory reads each field with the right type: required fields as non-null, optional ones as nullable, and lists converted with List<String>.from.',
    [
      { what: 'write the User class with final fields and a const constructor', say: 'Immutable models are safer to pass around.' },
      { what: 'add a fromJson factory that reads each field with its type and defaults for missing ones', say: 'Optional fields are nullable or get a default, never a crash.' },
      { what: 'write parseUsers, which decodes the body and maps each entry through fromJson', say: 'In the app this runs in the data layer, never in widgets.' }
    ],
    `//@step
import 'dart:convert';

class User {
  final int id;
  final String name;
  final String? email;
  final List<String> roles;

  const User({required this.id, required this.name, this.email, this.roles = const []});
//@step
  factory User.fromJson(Map<String, dynamic> json) => User(
        id: (json['id'] as num).toInt(),
        name: json['name'] as String,
        email: json['email'] as String?,
        roles: json['roles'] == null ? const [] : List<String>.from(json['roles'] as List),
      );
}
//@step
List<User> parseUsers(String body) {
  final list = jsonDecode(body) as List<dynamic>;
  return list.map((e) => User.fromJson(e as Map<String, dynamic>)).toList();
}`,
    'With one user that has id 1, name Ada and roles ["admin"] but no email: the factory reads id as an int, email as null, and roles as a typed list.',
    'O(n) in the size of the JSON.',
    `void main() {
  final users = parseUsers('[{"id":1,"name":"Ada","roles":["admin"]},{"id":2.0,"name":"Bo","email":"bo@x.io"}]');
  print(__c.jsonEncode([users.length, users[0].name, users[0].email, users[0].roles, users[1].id, users[1].email, users[1].roles]));
}`,
    `void main() {
  final users = parseUsers('[{"id":1,"name":"Ada","roles":["admin"]}]');
  print('\${users.first.name} \${users.first.email} \${users.first.roles}'); // Ada null [admin]
}`,
    [2, 'Ada', null, ['admin'], 2, 'bo@x.io', []]),
  dart('dart-retry-backoff', 'Retry a Future with Exponential Backoff', 'medium',
    'Write Future<T> retry<T>(Future<T> Function() task, {int retries = 3, Duration baseDelay = const Duration(milliseconds: 200)}) that runs task, and on an exception waits baseDelay, then twice that, and so on, up to retries extra attempts. ' +
      'It returns the first success or rethrows the last error.',
    'Future<T> retry<T>(Future<T> Function() task, {int retries = 3, Duration baseDelay = const Duration(milliseconds: 200)})',
    'Write a helper that retries a failing network call a few times, waiting longer after each failure.',
    'Loop over attempts with async and await. Return the task\'s result on success. On an error, rethrow if there are no attempts left; otherwise wait baseDelay multiplied by 2 to the attempt number, then try again.',
    [
      { what: 'write the async function with an attempt loop', say: 'await keeps the retry logic readable.' },
      { what: 'try the task and return its value; on an error, rethrow when out of attempts', say: 'The caller sees the last real error.' },
      { what: 'otherwise wait with a delay that doubles each time', say: 'Backoff gives a struggling server room to recover.' }
    ],
    `//@step
Future<T> retry<T>(Future<T> Function() task, {int retries = 3, Duration baseDelay = const Duration(milliseconds: 200)}) async {
  for (var attempt = 0; ; attempt++) {
    try {
//@step
      return await task();
    } catch (_) {
      if (attempt >= retries) rethrow;
//@step
      await Future<void>.delayed(baseDelay * (1 << attempt));
    }
  }
}`,
    'A task that fails twice: attempt 0 fails and waits 200 ms, attempt 1 fails and waits 400 ms, attempt 2 succeeds and its value is returned.',
    'O(retries) attempts, total waiting about baseDelay times 2 to the retries.',
    `Future<void> main() async {
  var n = 0;
  final ok = await retry(() async {
    n++;
    if (n < 3) throw Exception('fail');
    return 'ok after \$n';
  }, baseDelay: const Duration(milliseconds: 5));
  String? failed;
  try {
    await retry<String>(() async => throw StateError('down'), retries: 2, baseDelay: const Duration(milliseconds: 5));
  } on StateError catch (e) {
    failed = e.message;
  }
  print(__c.jsonEncode([ok, failed]));
}`,
    `Future<void> main() async {
  var calls = 0;
  final result = await retry(() async {
    calls++;
    if (calls < 3) throw Exception('flaky');
    return 'done';
  });
  print('\$result after \$calls calls'); // done after 3 calls
}`,
    ['ok after 3', 'down']),
  dart('dart-debouncer', 'Debounce in Dart', 'medium',
    'Write a Debouncer class with a duration and a run(void Function() action) method: each call cancels the pending action and schedules the new one, so only the last action within the duration runs. Add dispose() to cancel any pending action. ' +
      'Typical use: a search field that calls the API only after the user stops typing.',
    'class Debouncer { Debouncer(Duration duration); void run(void Function() action); void dispose() }',
    'Write a debouncer for a search box: many quick calls, one action at the end.',
    'Keep a Timer. run cancels the existing timer and starts a new one with the action. dispose cancels it, which matters in Flutter so nothing runs after the widget is gone.',
    [
      { what: 'write the class with the duration and a nullable Timer', say: 'One timer is enough; each call replaces it.' },
      { what: 'run cancels the old timer and starts a new one for this action', say: 'Only the last call survives.' },
      { what: 'dispose cancels the pending timer', say: 'Called from the widget\'s dispose, so no callback hits a disposed widget.' }
    ],
    `//@step
import 'dart:async';

class Debouncer {
  final Duration duration;
  Timer? _timer;

  Debouncer(this.duration);
//@step
  void run(void Function() action) {
    _timer?.cancel();
    _timer = Timer(duration, action);
  }
//@step
  void dispose() {
    _timer?.cancel();
    _timer = null;
  }
}`,
    'Three calls in quick succession: the first two timers are cancelled, and only the third action runs when its timer fires.',
    'O(1) per call.',
    `Future<void> main() async {
  final calls = <int>[];
  final d = Debouncer(const Duration(milliseconds: 20));
  d.run(() => calls.add(1));
  d.run(() => calls.add(2));
  d.run(() => calls.add(3));
  await Future<void>.delayed(const Duration(milliseconds: 60));
  d.run(() => calls.add(4));
  d.dispose();
  await Future<void>.delayed(const Duration(milliseconds: 60));
  print(__c.jsonEncode(calls));
}`,
    `Future<void> main() async {
  final search = Debouncer(const Duration(milliseconds: 300));
  for (final q in ['f', 'fl', 'flu', 'flutter']) {
    search.run(() => print('searching \$q'));
  }
  await Future<void>.delayed(const Duration(milliseconds: 400)); // searching flutter
}`,
    [3]),
  dart('dart-concurrency-pool', 'Run Futures with a Concurrency Limit', 'hard',
    'Write Future<List<R>> mapWithLimit<T, R>(List<T> items, int limit, Future<R> Function(T item) work) that processes all items with at most limit running at once, and returns the results in the original order. ' +
      'Example: uploading 10 photos with limit 3 never has more than 3 uploads in flight.',
    'Future<List<R>> mapWithLimit<T, R>(List<T> items, int limit, Future<R> Function(T item) work)',
    'Process a list of async jobs, like uploads, with at most a few running at the same time, keeping results in order.',
    'Start limit workers. Each worker repeatedly takes the next unclaimed index, awaits the work for that item and stores the result at its index. Because Dart is single-threaded, taking the next index is safe without locks. Wait for all workers with Future.wait.',
    [
      { what: 'write the function with a results list and a shared next index', say: 'Results are stored by index, so order is kept.' },
      { what: 'write a worker that loops, claiming the next index and awaiting its work until none are left', say: 'The event loop runs one worker at a time between awaits, so claiming is safe.' },
      { what: 'start up to limit workers, wait for all of them, and return the results', say: 'At most limit pieces of work are ever in flight.' }
    ],
    `//@step
Future<List<R>> mapWithLimit<T, R>(List<T> items, int limit, Future<R> Function(T item) work) async {
  final results = List<R?>.filled(items.length, null);
  var next = 0;
//@step
  Future<void> worker() async {
    while (next < items.length) {
      final i = next++;
      results[i] = await work(items[i]);
    }
  }
//@step
  final count = limit < items.length ? limit : items.length;
  await Future.wait(List.generate(count, (_) => worker()));
  return results.cast<R>();
}`,
    'With 10 items and limit 3, three workers each claim an item; whenever one finishes it claims the next, so never more than 3 are running, and each result lands at its own index.',
    'O(n) work items; time is roughly n divided by limit times the job duration.',
    `Future<void> main() async {
  var running = 0;
  var peak = 0;
  final out = await mapWithLimit<int, int>(List.generate(10, (i) => i), 3, (n) async {
    running++;
    if (running > peak) peak = running;
    await Future<void>.delayed(Duration(milliseconds: 5 + (n % 3) * 5));
    running--;
    return n * n;
  });
  print(__c.jsonEncode([peak, out]));
}`,
    `Future<void> main() async {
  final sizes = await mapWithLimit<String, int>(['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'], 2, (name) async {
    await Future<void>.delayed(const Duration(milliseconds: 100)); // pretend upload
    return name.length;
  });
  print(sizes); // [5, 5, 5, 5]
}`,
    [3, [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]]),
  dart('dart-ttl-cache', 'In-Memory Cache with Expiry', 'medium',
    'Write a TtlCache<K, V> with a time-to-live: put(key, value) stores a value, get(key) returns it if it has not expired, otherwise null and removes it. Take a clock function in the constructor so it can be tested. ' +
      'Example: with a 5 second ttl, a value put at time 0 is returned at time 4 and gone at time 6.',
    'class TtlCache<K, V> { TtlCache(Duration ttl, {DateTime Function()? now}); void put(K key, V value); V? get(K key) }',
    'Build a small cache where entries disappear after a set time, for example to avoid refetching the same API data within a minute.',
    'Store each value with its expiry time. get checks the clock: an expired entry is removed and null returned. The clock is injected, defaulting to DateTime.now, so tests can move time forward without waiting.',
    [
      { what: 'write the class with the ttl, an injected clock and a map of entries', say: 'Injecting the clock makes expiry testable.' },
      { what: 'put stores the value with now plus ttl as its expiry', say: 'Each entry carries its own deadline.' },
      { what: 'get returns the value if not expired, otherwise removes it and returns null', say: 'Expired entries are cleaned up lazily.' }
    ],
    `//@step
class TtlCache<K, V> {
  final Duration ttl;
  final DateTime Function() _now;
  final _entries = <K, (V, DateTime)>{};

  TtlCache(this.ttl, {DateTime Function()? now}) : _now = now ?? DateTime.now;
//@step
  void put(K key, V value) {
    _entries[key] = (value, _now().add(ttl));
  }
//@step
  V? get(K key) {
    final entry = _entries[key];
    if (entry == null) return null;
    if (!_now().isBefore(entry.$2)) {
      _entries.remove(key);
      return null;
    }
    return entry.$1;
  }
}`,
    'With a 5 second ttl: put at time 0 expires at 5. A get at time 4 is before 5, so it returns the value; a get at 6 is past it, so the entry is removed and null returned.',
    'O(1) per operation. O(n) space for n entries.',
    `void main() {
  var t = DateTime(2026);
  final cache = TtlCache<String, int>(const Duration(seconds: 5), now: () => t);
  cache.put('a', 1);
  final out = <int?>[cache.get('a')];
  t = t.add(const Duration(seconds: 4));
  out.add(cache.get('a'));
  t = t.add(const Duration(seconds: 2));
  out.add(cache.get('a'));
  out.add(cache.get('missing'));
  print(__c.jsonEncode(out));
}`,
    `void main() {
  final cache = TtlCache<String, String>(const Duration(minutes: 1));
  cache.put('profile', 'Ada');
  print(cache.get('profile')); // Ada, until a minute has passed
}`,
    [1, 1, null, null]),
  dart('dart-group-transactions', 'Group Transactions by Day', 'easy',
    'Given a list of transactions, each a record (DateTime at, int amountKobo), write Map<String, int> dailyTotals(List<(DateTime, int)> items) that returns the total amount per day, keyed "yyyy-mm-dd", with days in ascending order. ' +
      'Example: two payments on 2026-10-01 of 500 and 250 and one on 2026-10-02 of 100 give {"2026-10-01": 750, "2026-10-02": 100}.',
    'Map<String, int> dailyTotals(List<(DateTime, int)> items)',
    'Add up transaction amounts per calendar day, like a daily summary on a wallet screen.',
    'Build a day key from each date, zero-padded so it sorts correctly, and add the amount into a map. A SplayTreeMap keeps the keys sorted, so the days come out in order. Amounts stay in the smallest unit as integers, never doubles.',
    [
      { what: 'write a helper that formats a date as a zero-padded yyyy-mm-dd key', say: 'Padding makes the text keys sort like dates.' },
      { what: 'add each amount into a sorted map under its day key', say: 'Money stays in integer minor units to avoid rounding errors.' },
      { what: 'return the map', say: 'n log d time for n items over d days.' }
    ],
    `//@step
import 'dart:collection';

String _dayKey(DateTime d) =>
    '\${d.year.toString().padLeft(4, '0')}-\${d.month.toString().padLeft(2, '0')}-\${d.day.toString().padLeft(2, '0')}';
//@step
Map<String, int> dailyTotals(List<(DateTime, int)> items) {
  final totals = SplayTreeMap<String, int>();
  for (final (at, amount) in items) {
    final key = _dayKey(at);
    totals[key] = (totals[key] ?? 0) + amount;
  }
//@step
  return totals;
}`,
    'Two payments on October 1st add up to 750 under "2026-10-01", and the one on the 2nd gives 100 under "2026-10-02".',
    'O(n log d) time. O(d) space.',
    `void main() {
  final totals = dailyTotals([
    (DateTime(2026, 10, 2, 9), 100),
    (DateTime(2026, 10, 1, 8), 500),
    (DateTime(2026, 10, 1, 20), 250),
  ]);
  print(__c.jsonEncode([totals.keys.toList(), totals.values.toList()]));
}`,
    `void main() {
  print(dailyTotals([(DateTime(2026, 10, 1), 500), (DateTime(2026, 10, 1), 250), (DateTime(2026, 10, 2), 100)]));
  // {2026-10-01: 750, 2026-10-02: 100}
}`,
    [['2026-10-01', '2026-10-02'], [750, 100]]),
  dart('dart-sealed-result', 'A Result Type with Sealed Classes', 'medium',
    'Write a sealed Result<T> with subclasses Success<T>(value) and Failure<T>(message), and a function Result<int> parseAge(String input) that returns Failure for non-numbers or ages outside 0 to 150. ' +
      'Then write String describe(Result<int> r) using an exhaustive switch. Example: describe(parseAge("42")) returns "age 42"; describe(parseAge("abc")) returns "error: not a number".',
    'sealed class Result<T> {} final class Success<T> extends Result<T> {} final class Failure<T> extends Result<T> {} Result<int> parseAge(String input) String describe(Result<int> r)',
    'Model success or failure with a sealed class so the compiler makes every caller handle both.',
    'A sealed class has a fixed set of subclasses known to the compiler, so a switch over it is checked for exhaustiveness. Functions that can fail return Result instead of throwing, and callers switch on it with patterns.',
    [
      { what: 'declare the sealed Result with Success and Failure subclasses', say: 'Sealed means the compiler knows every case.' },
      { what: 'write parseAge, returning Failure with a clear message for bad input', say: 'Errors become values the caller must look at.' },
      { what: 'write describe with a switch expression that destructures each case', say: 'If a new case is added, this switch stops compiling until it is handled.' }
    ],
    `//@step
sealed class Result<T> {
  const Result();
}

final class Success<T> extends Result<T> {
  final T value;
  const Success(this.value);
}

final class Failure<T> extends Result<T> {
  final String message;
  const Failure(this.message);
}
//@step
Result<int> parseAge(String input) {
  final n = int.tryParse(input.trim());
  if (n == null) return const Failure('not a number');
  if (n < 0 || n > 150) return const Failure('out of range');
  return Success(n);
}
//@step
String describe(Result<int> r) => switch (r) {
      Success(value: final v) => 'age \$v',
      Failure(message: final m) => 'error: \$m',
    };`,
    'parseAge("42") returns Success(42), which describe turns into "age 42". parseAge("abc") returns Failure("not a number"), described as "error: not a number".',
    'O(n) for the input length.',
    `void main() {
  print(__c.jsonEncode([describe(parseAge('42')), describe(parseAge('abc')), describe(parseAge(' 200 '))]));
}`,
    `void main() {
  print(describe(parseAge('42'))); // age 42
  print(describe(parseAge('abc'))); // error: not a number
}`,
    ['age 42', 'error: not a number', 'error: out of range']),
  dart('dart-stream-transform', 'Transform and Combine Streams', 'medium',
    'Given a Stream<int> of sensor readings, write Stream<double> movingAverage(Stream<int> source, int window) that emits the average of the last window readings each time a new reading arrives, starting once window readings have been seen. ' +
      'Example: readings 1, 2, 3, 4 with window 2 emit 1.5, 2.5, 3.5.',
    'Stream<double> movingAverage(Stream<int> source, int window)',
    'Turn a stream of readings into a stream of moving averages.',
    'Use an async generator: await for each reading, keep the last window values in a queue with a running sum, and yield the average once the queue is full. The sum is updated by adding the new value and subtracting the one that drops out.',
    [
      { what: 'write an async star function with a queue of recent values and a running sum', say: 'async star with yield makes stream transforms read like loops.' },
      { what: 'for each reading, add it, drop the oldest when the window is exceeded, and adjust the sum', say: 'Each reading costs constant time.' },
      { what: 'yield the average once the window is full', say: 'Subscriptions and cancellation are handled by the generator.' }
    ],
    `//@step
import 'dart:collection';

Stream<double> movingAverage(Stream<int> source, int window) async* {
  final recent = Queue<int>();
  var sum = 0;
//@step
  await for (final value in source) {
    recent.add(value);
    sum += value;
    if (recent.length > window) sum -= recent.removeFirst();
//@step
    if (recent.length == window) yield sum / window;
  }
}`,
    'With 1, 2, 3, 4 and window 2: after 2 the average is 1.5; after 3 the window holds 2 and 3, average 2.5; after 4 it holds 3 and 4, average 3.5.',
    'O(1) per reading. O(window) space.',
    `Future<void> main() async {
  final out = await movingAverage(Stream.fromIterable([1, 2, 3, 4]), 2).toList();
  print(__c.jsonEncode(out));
}`,
    `Future<void> main() async {
  await for (final avg in movingAverage(Stream.fromIterable([10, 20, 30, 40]), 3)) {
    print(avg); // 20.0, then 30.0
  }
}`,
    [1.5, 2.5, 3.5]),
  dart('dart-validate-signup', 'Validate a Sign-up Form', 'easy',
    'Write Map<String, String> validateSignup({required String email, required String password, required String confirm}) that returns a map from field name to an error message for each invalid field, and an empty map when everything is valid. ' +
      'Rules: email must look like name@domain.tld; password at least 8 characters with a letter and a digit; confirm must equal password.',
    'Map<String, String> validateSignup({required String email, required String password, required String confirm})',
    'Check a sign-up form and return a clear error per field, the way a form state class would.',
    'Validate each field independently and collect the messages in a map, so the UI can show each error under its own field. Keep the rules in plain functions, testable without widgets.',
    [
      { what: 'write the function with an errors map and a simple email pattern', say: 'A practical pattern; the real check is the confirmation email.' },
      { what: 'check the password length, a letter and a digit, and that confirm matches', say: 'Each rule gives its own clear message.' },
      { what: 'return the errors map, empty when the form is valid', say: 'The form submits only when the map is empty.' }
    ],
    `//@step
Map<String, String> validateSignup({required String email, required String password, required String confirm}) {
  final errors = <String, String>{};
  if (!RegExp(r'^[^@\\s]+@[^@\\s]+\\.[^@\\s]+\$').hasMatch(email.trim())) {
    errors['email'] = 'Enter a valid email address';
  }
//@step
  if (password.length < 8 || !RegExp(r'[A-Za-z]').hasMatch(password) || !RegExp(r'\\d').hasMatch(password)) {
    errors['password'] = 'Use at least 8 characters with a letter and a number';
  }
  if (confirm != password) errors['confirm'] = 'Passwords do not match';
//@step
  return errors;
}`,
    'With email "ada@x.io", password "secret12" and the same confirmation, every rule passes, so the map is empty. With "ada@" the email error appears.',
    'O(n) in the input lengths.',
    `void main() {
  final ok = validateSignup(email: 'ada@x.io', password: 'secret12', confirm: 'secret12');
  final bad = validateSignup(email: 'ada@', password: 'short', confirm: 'other');
  print(__c.jsonEncode([ok.length, bad.keys.toList()]));
}`,
    `void main() {
  print(validateSignup(email: 'ada@', password: 'short', confirm: 'other'));
  // {email: Enter a valid email address, password: Use at least 8 characters with a letter and a number, confirm: Passwords do not match}
}`,
    [0, ['email', 'password', 'confirm']]),
  dart('dart-paginate', 'Client-Side Pagination Helper', 'easy',
    'Write a Page<T> class with items, page number and hasMore, and a function Page<T> paginate<T>(List<T> all, int page, int pageSize) that returns that page (1-based) of the list. A page beyond the end returns no items and hasMore false. ' +
      'Example: 25 items with pageSize 10: page 3 has 5 items and hasMore false.',
    'class Page<T> { final List<T> items; final int page; final bool hasMore } Page<T> paginate<T>(List<T> all, int page, int pageSize)',
    'Split a list into pages for an infinite scroll list, saying whether more pages exist.',
    'The page starts at (page minus 1) times pageSize. Clamp the start and end to the list length, take the sublist, and say there is more if the end is before the list ends.',
    [
      { what: 'write the immutable Page class', say: 'It is what the list screen state needs.' },
      { what: 'compute the start and end, clamped to the list length', say: 'Clamping makes out-of-range pages return empty instead of throwing.' },
      { what: 'return the sublist with the page number and whether more remain', say: 'Linear in the page size.' }
    ],
    `//@step
class Page<T> {
  final List<T> items;
  final int page;
  final bool hasMore;

  const Page(this.items, this.page, this.hasMore);
}
//@step
Page<T> paginate<T>(List<T> all, int page, int pageSize) {
  final start = ((page - 1) * pageSize).clamp(0, all.length);
  final end = (start + pageSize).clamp(0, all.length);
//@step
  return Page(all.sublist(start, end), page, end < all.length);
}`,
    'With 25 items and pageSize 10, page 3 starts at 20 and ends at 25, so it has 5 items and nothing after it.',
    'O(pageSize) time and space.',
    `void main() {
  final all = List.generate(25, (i) => i);
  final p1 = paginate(all, 1, 10);
  final p3 = paginate(all, 3, 10);
  final p4 = paginate(all, 4, 10);
  print(__c.jsonEncode([p1.items.length, p1.hasMore, p3.items, p3.hasMore, p4.items.length, p4.hasMore]));
}`,
    `void main() {
  final page = paginate(List.generate(25, (i) => 'item \$i'), 3, 10);
  print('\${page.items.length} items, more: \${page.hasMore}'); // 5 items, more: false
}`,
    [10, true, [20, 21, 22, 23, 24], false, 0, false])
];
