// Observable interop (websocket-spec.md T7): toObservable/fromObservable round-trip, real RxJS
// from() consumption (rxjs is a devDependency only — nothing in the shipped package depends on
// it), and ObservableController's hostConnected/hostDisconnected lifecycle. Pure — no DOM needed
// for the controller case; a fake ReactiveControllerHost stands in, same pattern as
// tests/dnd.test.js's fakeHost().
import { test, expect } from "vitest";
import { from } from "rxjs";
import { createStore, toObservable, fromObservable, ObservableController } from "../../packages/store/dist/index.js";

function fakeHost() {
	return { addController() {}, requestUpdate() {}, updateComplete: Promise.resolve(true) };
}

test("a store round-trips through toObservable/fromObservable", () => {
	const store = createStore(() => ({ n: 0 }));
	const observable = toObservable(store);
	const mirrored = fromObservable(observable, store.getState());

	expect(mirrored.getState().n).toBe(0);
	store.setState({ n: 1 });
	expect(mirrored.getState().n).toBe(1);
	store.setState({ n: 2 });
	expect(mirrored.getState().n).toBe(2);
});

test("fromObservable's result plugs into the same subscribe contract as any ReadableStore", () => {
	const store = createStore(() => ({ n: 0 }));
	const mirrored = fromObservable(toObservable(store), store.getState());
	const seen = [];
	mirrored.subscribe((state, previous) => seen.push([state.n, previous.n]));
	store.setState({ n: 5 });
	expect(seen).toEqual([[5, 0]]);
});

test("toObservable's output is consumable by a real RxJS from()", () => {
	const store = createStore(() => ({ n: 0 }));
	const observable = toObservable(store);
	const values = [];

	const subscription = from(observable).subscribe((state) => values.push(state.n));
	store.setState({ n: 1 });
	store.setState({ n: 2 });
	subscription.unsubscribe();
	store.setState({ n: 3 });

	expect(values).toEqual([0, 1, 2]); // 0 is the immediate replay on subscribe; 3 is after unsubscribe
});

test("ObservableController subscribes on hostConnected and unsubscribes on hostDisconnected (subscriber count asserted)", () => {
	let activeSubscribers = 0;
	const fakeObservable = {
		subscribe(observer) {
			activeSubscribers++;
			observer.next(0);
			return {
				unsubscribe() {
					activeSubscribers--;
				},
			};
		},
	};

	const controller = new ObservableController(fakeHost(), fakeObservable, -1);
	expect(activeSubscribers).toBe(0); // not yet connected

	controller.hostConnected();
	expect(activeSubscribers).toBe(1);
	expect(controller.value).toBe(0);

	controller.hostDisconnected();
	expect(activeSubscribers).toBe(0); // the actual subscription is gone, not just "disconnected"
});

test("ObservableController re-renders the host with each emitted value", () => {
	let renders = 0;
	let next;
	const fakeObservable = {
		subscribe(observer) {
			next = observer.next.bind(observer);
			return () => {};
		},
	};
	const host = { addController() {}, requestUpdate: () => renders++ };

	const controller = new ObservableController(host, fakeObservable, 0);
	controller.hostConnected();
	next(1);
	next(2);

	expect(controller.value).toBe(2);
	expect(renders).toBe(2);
});
