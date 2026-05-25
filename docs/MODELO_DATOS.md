# Modelo de datos por microservicio

## Auth Service - PostgreSQL

```sql
users(
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

refresh_tokens(
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token_hash TEXT,
  expires_at TIMESTAMP,
  revoked BOOLEAN,
  created_at TIMESTAMP
)
```

## User & Group Service - PostgreSQL

```sql
profiles(
  id UUID PRIMARY KEY,
  display_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP
)

groups(
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP
)

group_members(
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES groups(id),
  user_id UUID REFERENCES profiles(id),
  role VARCHAR(10),
  joined_at TIMESTAMP,
  UNIQUE(group_id, user_id)
)
```

## Expense Service - PostgreSQL

```sql
expenses(
  id UUID PRIMARY KEY,
  group_id UUID,
  paid_by UUID,
  amount DECIMAL(12,2),
  description VARCHAR(255),
  created_at TIMESTAMP
)

expense_splits(
  id UUID PRIMARY KEY,
  expense_id UUID REFERENCES expenses(id),
  user_id UUID,
  amount_owed DECIMAL(12,2),
  paid BOOLEAN,
  settled_at TIMESTAMP
)
```

## Notification Service - PostgreSQL

```sql
notifications(
  id UUID PRIMARY KEY,
  user_id TEXT,
  type TEXT,
  message TEXT,
  group_id TEXT,
  group_name TEXT,
  amount NUMERIC(12,2),
  read BOOLEAN,
  created_at TIMESTAMP
)
```

## Debt Calculator - Redis

```text
balances:{group_id} -> hash user_id => balance
debts:{group_id} -> JSON con transferencias optimas
```

## AI Agent - MongoDB

```text
ai_agent_db.chat_logs
  user_id
  group_id
  question
  answer
  created_at
```

## Report Service

No tiene base de datos propia. Es stateless y consulta datos en tiempo real.
