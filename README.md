# chaos-man
GitOps-driven chaos engineering pipeline with human approval gate
# ⚡ chaos-gitops

> GitOps-driven chaos engineering pipeline with human-in-the-loop approval gate.

Automatically test your app's resilience on every Git push — then decide whether to deploy.

![npm version](https://img.shields.io/npm/v/chaos-gitops)
![license](https://img.shields.io/npm/l/chaos-gitops)

---

## What is this?

`chaos-gitops` is a CLI tool that plugs into your Git workflow and attacks your app
the same way the real world would — before your code ever reaches production.

Every time you push code:

```
Git Push → Pull Code → Chaos Engine → Live Dashboard → Approve/Reject → Deploy
```

Works with **any backend, any language, any database.**

---

## The Chaos Tests

| Test | What it does |
|------|-------------|
| **Traffic Flood** | Hammers your app with rapid requests |
| **Bad Inputs** | SQL injection, script injection, null values, huge payloads |
| **Crash Recovery** | Kills your app and checks if it restarts cleanly |
| **Database Chaos** | Kills your database and checks graceful recovery |

---

## Installation

```bash
npm install -g chaos-gitops
```

---

## Quick Start

```bash
# 1. Go into your project
cd your-project

# 2. Initialize
chaos-gitops init

# 3. Edit chaos.config.json to match your stack

# 4. Run
chaos-gitops run

# 5. Open dashboard
# http://localhost:8080
```

---

## Configuration

### Node.js + Redis
```json
{
  "url": "http://localhost",
  "port": 3000,
  "health": "/health",
  "app": {
    "start_command":  "node app.js",
    "stop_command":   "pkill -f \"node app.js\"",
    "deploy_command": "git pull && npm install",
    "ready_wait": 3
  },
  "database": {
    "enabled": true,
    "type": "redis",
    "stop_command":   "sudo service redis-server stop",
    "start_command":  "sudo service redis-server start",
    "check_command":  "redis-cli ping",
    "check_expected": "PONG"
  }
}
```

### Python/Django + PostgreSQL
```json
{
  "url": "http://localhost",
  "port": 8000,
  "health": "/health",
  "app": {
    "start_command":  "python manage.py runserver",
    "stop_command":   "pkill -f \"manage.py\"",
    "deploy_command": "git pull && pip install -r requirements.txt",
    "ready_wait": 4
  },
  "database": {
    "enabled": true,
    "type": "postgres",
    "stop_command":   "sudo service postgresql stop",
    "start_command":  "sudo service postgresql start",
    "check_command":  "pg_isready",
    "check_expected": "/var/run/postgresql:5432 - accepting connections"
  }
}
```

### Go + MySQL
```json
{
  "url": "http://localhost",
  "port": 8080,
  "health": "/health",
  "app": {
    "start_command":  "./main",
    "stop_command":   "pkill -f main",
    "deploy_command": "git pull && go build -o main",
    "ready_wait": 2
  },
  "database": {
    "enabled": true,
    "type": "mysql",
    "stop_command":   "sudo service mysql stop",
    "start_command":  "sudo service mysql start",
    "check_command":  "mysqladmin ping",
    "check_expected": "mysqld is alive"
  }
}
```

### Java/Spring + MongoDB
```json
{
  "url": "http://localhost",
  "port": 8080,
  "health": "/actuator/health",
  "app": {
    "start_command":  "java -jar app.jar",
    "stop_command":   "pkill -f \"app.jar\"",
    "deploy_command": "git pull && mvn package -DskipTests",
    "ready_wait": 8
  },
  "database": {
    "enabled": true,
    "type": "mongodb",
    "stop_command":   "sudo service mongod stop",
    "start_command":  "sudo service mongod start",
    "check_command":  "mongosh --eval \"db.adminCommand('ping').ok\" --quiet",
    "check_expected": "1"
  }
}
```

### Ruby on Rails + PostgreSQL
```json
{
  "url": "http://localhost",
  "port": 3000,
  "health": "/health",
  "app": {
    "start_command":  "rails server",
    "stop_command":   "pkill -f \"rails server\"",
    "deploy_command": "git pull && bundle install && rails db:migrate",
    "ready_wait": 5
  },
  "database": {
    "enabled": true,
    "type": "postgres",
    "stop_command":   "sudo service postgresql stop",
    "start_command":  "sudo service postgresql start",
    "check_command":  "pg_isready",
    "check_expected": "/var/run/postgresql:5432 - accepting connections"
  }
}
```

### PHP/Laravel + MySQL
```json
{
  "url": "http://localhost",
  "port": 8000,
  "health": "/health",
  "app": {
    "start_command":  "php artisan serve",
    "stop_command":   "pkill -f \"artisan serve\"",
    "deploy_command": "git pull && composer install",
    "ready_wait": 3
  },
  "database": {
    "enabled": true,
    "type": "mysql",
    "stop_command":   "sudo service mysql stop",
    "start_command":  "sudo service mysql start",
    "check_command":  "mysqladmin ping",
    "check_expected": "mysqld is alive"
  }
}
```

---

## Full Config Reference

```json
{
  "url":       "http://localhost",
  "port":      3000,
  "health":    "/health",
  "dashboard": true,
  "repo_path": "/home/user/my-project",

  "app": {
    "start_command":  "node app.js",
    "stop_command":   "pkill -f \"node app.js\"",
    "deploy_command": "git pull && npm install",
    "ready_wait":     3
  },

  "database": {
    "enabled":        true,
    "type":           "redis",
    "stop_command":   "sudo service redis-server stop",
    "start_command":  "sudo service redis-server start",
    "check_command":  "redis-cli ping",
    "check_expected": "PONG"
  },

  "flood": {
    "enabled":   true,
    "requests":  100,
    "pass_rate": 90
  },

  "bad_inputs": {
    "enabled":  true,
    "endpoint": "/api/endpoint",
    "field":    "input"
  },

  "crash_recovery": {
    "enabled": true
  },

  "webhook": {
    "port":   9000,
    "secret": "your_github_webhook_secret"
  }
}
```

---

## CLI Commands

```bash
# Initialize in your project
chaos-gitops init

# Run chaos tests
chaos-gitops run

# Run with CLI overrides
chaos-gitops run --url http://localhost --port 8000 --no-dashboard

# Start webhook listener for GitOps
chaos-gitops webhook --port 9000 --secret your_secret
```

---

## GitOps Integration (GitHub Actions)

```yaml
name: Chaos Engineering Pipeline

on:
  push:
    branches: [main]

jobs:
  chaos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Start your app
        run: |
          npm install
          npm start &
          sleep 3

      - name: Run chaos tests
        run: |
          npm install -g chaos-gitops
          chaos-gitops run --no-dashboard
```

---

## Self-hosted GitOps Webhook

```bash
# Start webhook listener on your server
chaos-gitops webhook --port 9000 --secret your_secret
```

Add to GitHub repo settings:
- **Payload URL:** `https://your-server:9000/webhook`
- **Content type:** `application/json`
- **Secret:** your secret
- **Events:** Push only

---

## Requirements

- Node.js 18+
- Any backend (Node.js, Python, Go, Java, Ruby, PHP...)
- Any database (Redis, PostgreSQL, MySQL, MongoDB...)
- Linux / WSL / macOS

---

## How the Approval Gate Works

After all tests complete:

- ✅ **Approve & Deploy** — runs your `deploy_command`
- ❌ **Reject** — does nothing, current version stays live

---

## Why chaos-gitops?

| Feature | chaos-gitops | Gremlin | LitmusChaos | Harness |
|---------|:---:|:---:|:---:|:---:|
| Single command install | ✅ | ❌ | ❌ | ❌ |
| No Kubernetes needed | ✅ | ❌ | ❌ | ❌ |
| Human approval gate | ✅ | ❌ | ❌ | ❌ |
| Any language/stack | ✅ | ❌ | ❌ | ❌ |
| Free & open source | ✅ | ❌ | ✅ | ❌ |
| Works on a laptop | ✅ | ❌ | ❌ | ❌ |

---

## Contributing

Pull requests are welcome! To add a new chaos test:

1. Fork this repo
2. Add your test in `lib/commands/run.js`
3. Submit a PR describing what real-world failure it simulates

---

## License

MIT © mr_bright

---

Built by **mr_bright** — a DevOps engineer who believes code should
survive the real world before it meets it.
