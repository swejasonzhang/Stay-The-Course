# Design Decisions

The non-obvious choices in Stay the Course: what I chose, why, what I rejected, and what it cost.

---

## 1. Keep the finance math separate from the API
*2026-10-20*

**Decision**
The backend has two folders. `engine/` holds all the finance math as pure functions, with no HTTP, files or database. `api/` is a thin FastAPI layer that checks each request, calls the engine and returns JSON. Dependencies point one way: `api/` imports `engine/`, and `engine/` never imports FastAPI or Pydantic.

**Why**
- **Testing.** I can call an engine function directly in a test and compare the result with a known formula. If an engine test fails, the bug is in the math, not in the request, the validation or the JSON.
- **Reuse.** If the math lived inside a route handler, an HTTP request would be the only way to run it. As its own module, any code can import it. The Monte Carlo simulator reuses the yearly growth logic, and a script or notebook can call the engine without starting a server.
- **Separate reasons to change.** The API changes when the contract with the frontend changes, such as a renamed field or a new error code. The engine changes when the math changes. Keeping them apart means a change to one can't break the other.

**Follow-up: why not test everything through FastAPI's TestClient?**
TestClient makes route tests cheap, but when a route test fails, the cause could be a badly built request, a mismatched field name, rejected input, different serialization or wrong math. So I test each layer on its own. Many fast engine tests check the math against exact numbers, and a few TestClient tests check the contract: missing fields are rejected and responses have the right shape.

**Rejected alternative**
Writing the math directly inside the route handlers:

```
Rejected: math inside the route
  POST /fees:
    read JSON, check fields
    loop 30 years: grow balance, subtract fee
    build JSON response

Chosen: split
  engine/fees.py   the fee math (pure functions)
  api/main.py      read JSON, check fields → call the engine → build JSON
```

**Trade-off**
More files, and one more layer to trace through when following a request. For a 20-line script that would be overkill. Here it's worth it because the engine will grow to three modules and carry most of the tests.

---

## 2. Pydantic schemas live in `api/schemas.py`
*2026-10-20*

**Decision**
The Pydantic request and response models live in `backend/api/schemas.py`, not inside the route handlers and not in `engine/`.

**Why**
These models describe the JSON the frontend sends and receives, which is the API's contract and an HTTP concern. Routes turn a validated request into plain Python values before calling the engine, so the engine never sees a Pydantic object.

**Rejected alternatives**
- **Inside the route file:** fine at first, but crowded once three modules' worth of endpoints share it.
- **In `engine/`:** the engine would have to import Pydantic and know the shape of the HTTP contract, which breaks decision 1.

**Naming**
`schemas.py`, not `models.py`, because in many Python projects "models" means database tables.

**Trade-off**
Each route needs a small conversion step from schema to plain values and back.

---

## 3. Build in Python first, port to Java later
*2026-10-20*

**Decision**
Version 1 is Python: NumPy for the engine and FastAPI for the API. After I apply, I'll port the rebalancer to Java with Spring Boot.

**Why**
I have about a month, roughly 100 hours. Python is my stronger language, so that time goes into the math, the tests and the design instead of learning a new language at the same time. Java is a standard backend language at large financial firms, so porting one module afterward shows I can pick up a new stack. The Python tests also double as a spec for the port.

**Rejected alternatives**
- **Java and Spring Boot from day one:** learning a language, a framework and the finance in one month would leave parts of the project I can't fully explain.
- **All TypeScript:** fastest to build, but shows the least new skill.

**Trade-off**
Version 1 isn't written in the language a backend team at a large finance firm is most likely to use. The Java port is a planned follow-up, not part of version 1.
