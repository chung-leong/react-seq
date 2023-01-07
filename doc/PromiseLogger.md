# PromiseLogger

[Inspector](./Inspector.md) used for unit testing

## Methods

* `oldEvents` - Return all events that match the provided predicate.
* `oldEvent` - Return the last event that matches the provided predicate.
* `newEvent` <sup>async</sup> - Wait for an event that matches the provided predicate. Accepts an optional
timeout value (in milliseconds).
* `event` <sup>async</sup> - Return or wait for an event that matches the provided predicate. Accepts an optional
a timeout value.

## Notes

A predicate can be a callback function or an object containing the required properties (e.g. `{ type: 'await' }`).
