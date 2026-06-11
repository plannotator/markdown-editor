// React's act() requires this outside test renderers.
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
