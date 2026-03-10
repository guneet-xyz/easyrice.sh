# 🍚 EasyRice — Complete Plan

## Vision

EasyRice is a two-part platform for managing, sharing, and discovering Linux desktop rices:

- **CLI** (`easyrice` / `rice`) — Manages rice configs as a git repo with symlinks
- **Website** (`easyrice.sh`) — Gallery-first marketplace powered by GitHub repos

## Decisions

| Decision        | Choice                                                                                  |
| --------------- | --------------------------------------------------------------------------------------- |
| CLI Language    | **Go** (cobra + bubbletea)                                                              |
| CLI Location    | `apps/cli/` in monorepo                                                                 |
| Initial Apps    | Hyprland, Ghostty, Zsh, Neovim                                                          |
| Config Dir      | `~/.config/easyrice/` (config), `~/.config/easyrice/rice/` (managed repo)               |
| Metadata Format | TOML (`easyrice.toml` in managed repo)                                                  |
| Config Strategy | Move & symlink (move configs to managed repo, symlink from original location)           |
| Try/Revert      | Git branches (`try-<temp-id>`), revert = checkout previous branch + delete try branch   |
| Alias           | Auto-create `rice` symlink during install                                               |
| Website Data    | Minimal DB — store connections + stars only, GitHub API does heavy lifting with caching |
| Gallery         | Gallery-first discovery with filtering                                                  |
| Docs            | Update alongside code                                                                   |

---

## Part 1: CLI Architecture

### Directory Structure

```
apps/cli/
├── go.mod / go.sum
├── main.go
├── Makefile
├── cmd/                         # Cobra commands
│   ├── root.go                  # Root command, aliases
│   ├── init.go
│   ├── scan.go
│   ├── track.go
│   ├── status.go
│   ├── commit.go
│   ├── checkout.go              # Also aliased as "try"
│   ├── screenshot.go
│   ├── push.go
│   └── connect.go
├── internal/
│   ├── config/                  # TOML config management
│   ├── apps/                    # App registry + definitions
│   ├── git/                     # Git operations
│   ├── github/                  # GitHub device flow auth
│   ├── rice/                    # Core logic (symlinks, repo management)
│   └── tui/                     # Interactive prompts (bubbletea)
```

### Filesystem Layout

```
~/.config/easyrice/
├── config.toml                  # CLI config (GitHub token, easyrice.sh token, preferences)
└── rice/                        # Managed git repository
    ├── .git/
    ├── easyrice.toml            # Rice metadata
    ├── screenshots/             # Auto-captured screenshots
    ├── hyprland/                # Tracked configs (example)
    ├── ghostty/
    ├── zsh/
    └── nvim/
```

### `easyrice.toml` (Rice Metadata — lives in managed repo, committed)

```toml
[rice]
name = "my-rice"
description = "Clean Hyprland setup with catppuccin"

[apps.hyprland]
paths = ["~/.config/hypr"]

[apps.ghostty]
paths = ["~/.config/ghostty"]

[apps.zsh]
paths = ["~/.zshrc", "~/.zshenv", "~/.config/zsh"]

[apps.nvim]
paths = ["~/.config/nvim"]

# Users can add custom apps:
[apps.custom-waybar]
paths = ["~/.config/waybar"]
```

### `config.toml` (CLI Config — NOT committed, local to the machine)

```toml
[github]
token = "ghp_..."
username = "guneet"

[easyrice]
api_url = "https://easyrice.sh/api"
token = "er_..."
```

### App Registry

Each supported app defines an ID, display name, description, and default config
paths to scan. Users can always override or add custom paths in `easyrice.toml`.

| App      | Default Scan Paths                                       |
| -------- | -------------------------------------------------------- |
| Hyprland | `~/.config/hypr/`                                        |
| Ghostty  | `~/.config/ghostty/`                                     |
| Zsh      | `~/.zshrc`, `~/.zshenv`, `~/.zprofile`, `~/.config/zsh/` |
| Neovim   | `~/.config/nvim/`                                        |

### Commands

#### `easyrice init`

1. Create `~/.config/easyrice/` and `~/.config/easyrice/rice/`
2. `git init` in `rice/`
3. Create default `easyrice.toml` with empty `[rice]` section
4. Initial commit: `"init: initialize easyrice"`
5. Prompt: "Scan for existing configs?" → runs `scan`

#### `easyrice scan`

1. Iterate through app registry, check if default paths exist on disk
2. For found configs, show bubbletea multi-select checklist
3. For each selected app → run `track` logic
4. Also report already-tracked apps

#### `easyrice track <app>`

1. Validate app is in registry (or accept custom with `--path` flag)
2. For each config path:
   - If path exists and is not already a symlink to our repo:
     - Move contents to `~/.config/easyrice/rice/<app>/`
     - Create symlink: original path → managed repo location
3. Update `easyrice.toml` with the tracked paths
4. `git add . && git commit -m "track: start tracking <app>"`

#### `easyrice status`

1. Run `git diff --stat` in managed repo
2. Parse changes by app directory
3. Display formatted table: `App | Status | Changed Files`
4. If changes exist: suggest `easyrice commit`

#### `easyrice commit`

- **Interactive** (no args): bubbletea multi-select of changed apps → commit message prompt
- **Direct**: `easyrice commit -a hyprland -m "updated gaps"`
- Stages selected app dirs + easyrice.toml, creates git commit

#### `easyrice checkout` / `easyrice try`

**Own branch:** `easyrice try <branch-name>`

1. Stash or commit current changes if dirty
2. `git checkout <branch-name>`
3. Re-apply symlinks from the new branch's config

**Remote rice:** `easyrice try <github-url> [--app <app>]`

1. Create temp branch: `try-<random-id>`
2. Fetch remote repo's configs
3. Copy selected app configs (or all) into managed repo on temp branch
4. Update symlinks, commit on temp branch
5. Print: `"Trying @user's rice. Run 'easyrice try --revert' to go back."`

**Revert:** `easyrice try --revert`

1. Checkout previous branch (main or wherever they were before)
2. Delete the `try-*` branch
3. Re-apply symlinks from restored branch

#### `easyrice screenshot`

1. Detect display server (Wayland → `grim`, X11 → `scrot`/`maim`)
2. Capture full desktop screenshot
3. Optional: `--app <app>` to focus/capture specific app window
4. Save to `~/.config/easyrice/rice/screenshots/`
5. `git add screenshots/ && git commit -m "screenshots: update"`

#### `easyrice push`

1. Check for configured git remote
2. If no remote: prompt to add GitHub remote (requires `connect` first)
3. `git push origin <branch>`

#### `easyrice connect`

Two-part authentication:

**GitHub (for git operations):**

- GitHub Device Flow: display code + URL → user authorizes in browser → poll for token
- Store token in `config.toml`, configure git remote with auth

**easyrice.sh (for marketplace):**

- Open browser to `https://easyrice.sh/cli/connect`
- User authenticates on website, token passed back to CLI
- Stored in `config.toml`

---

## Part 2: Website Architecture

### Data Philosophy

**Minimal storage, maximum GitHub API leverage:**

- DB stores only: connections (which GitHub repos are rices), branch selections, and stars
- Everything else (name, description, apps list, screenshots, file contents) fetched from GitHub API
- Cache GitHub API responses (Cloudflare KV or in-memory with TTL) to avoid rate limits
- Sync on demand: user clicks "sync" on dashboard, or GitHub webhook on push

### New Database Tables

```
rice
├── id (text, PK)
├── user_id (text, FK → user.id, CASCADE)
├── github_repo_full_name (text, unique)   -- "guneet/my-rice"
├── github_repo_id (text)
├── created_at (timestamp)
└── updated_at (timestamp)

rice_branch
├── id (text, PK)
├── rice_id (text, FK → rice.id, CASCADE)
├── branch_name (text)
├── is_featured (boolean, default false)   -- The default branch to display
├── created_at (timestamp)
└── updated_at (timestamp)
└── UNIQUE(rice_id, branch_name)

star
├── id (text, PK)
├── user_id (text, FK → user.id, CASCADE)
├── rice_id (text, FK → rice.id, CASCADE)
├── created_at (timestamp)
└── UNIQUE(user_id, rice_id)
```

**That's it.** Everything else comes from GitHub API (cached):

- Rice name & description → `easyrice.toml` in repo
- Screenshots → `screenshots/` directory in repo
- Tracked apps → `easyrice.toml` `[apps.*]` keys
- README → repo README
- Commit history, branches, etc.

### Caching Strategy

- Cache `easyrice.toml` contents per repo+branch (invalidate on sync/webhook)
- Cache screenshot file listings and raw URLs per repo+branch
- Cache GitHub repo metadata (description, default branch)
- TTL-based expiry, manual invalidation via sync button

### New Website Pages

| Route                     | Description                                                                  |
| ------------------------- | ---------------------------------------------------------------------------- |
| `/`                       | **Homepage** — Hero, featured rices, how it works, install CTA               |
| `/explore`                | **Gallery** — Rice cards in grid, filter by WM/apps/tags, search, sort       |
| `/explore/[owner]/[repo]` | **Rice detail** — Screenshots, branch selector, apps list, star, try command |
| `/dashboard`              | **Dashboard** — Connected rices, manage showcased branches, sync, stats      |
| `/dashboard/connect`      | **Connect repo** — Select from GitHub repos, pick branches to showcase       |
| `/cli/connect`            | **CLI auth page** — Generates token for `easyrice connect`                   |
| `/users/[username]`       | **Enhanced profile** — User's published rices, total stars                   |

### New API Routes

| Route                     | Method            | Description                                          |
| ------------------------- | ----------------- | ---------------------------------------------------- |
| `/api/rice`               | `GET`             | List/search public rices (paginated, filterable)     |
| `/api/rice`               | `POST`            | Connect a GitHub repo as a rice                      |
| `/api/rice/[id]`          | `DELETE`          | Disconnect a rice                                    |
| `/api/rice/[id]/branches` | `GET/POST/DELETE` | Manage showcased branches                            |
| `/api/rice/[id]/star`     | `POST/DELETE`     | Star/unstar                                          |
| `/api/rice/[id]/sync`     | `POST`            | Re-fetch metadata from GitHub                        |
| `/api/cli/token`          | `POST`            | Generate CLI auth token                              |
| `/api/github/repos`       | `GET`             | List user's GitHub repos (proxied, for connect flow) |
| `/api/github/contents`    | `GET`             | Fetch file contents from a rice repo (cached)        |

### GitHub Integration Flow

**Connecting a repo (website):**

1. User has GitHub OAuth linked (already in auth system)
2. `/dashboard/connect` → fetch user's GitHub repos via API using their access token
3. User selects a repo → website reads `easyrice.toml` from default branch via GitHub API
4. Validates it's an easyrice-managed repo
5. User picks which branches to showcase
6. Creates `rice` + `rice_branch` records in DB

**Viewing a rice (explore page):**

1. Load `rice` record from DB (just the GitHub repo reference)
2. Fetch `easyrice.toml` from GitHub API (cached) → name, description, apps
3. Fetch `screenshots/` directory listing from GitHub API (cached) → image URLs
4. Load star count from DB
5. Display rice detail page with `easyrice try github.com/<owner>/<repo>` command

---

## Part 3: Implementation Phases

### Phase 1: CLI Core (init → commit)

1. Set up Go project in `apps/cli/` with cobra + bubbletea
2. `easyrice init` — create directories, git init, generate easyrice.toml
3. App registry — Hyprland, Ghostty, Zsh, Neovim definitions
4. `easyrice scan` — detect existing configs, interactive selection
5. `easyrice track <app>` — move configs, create symlinks, commit
6. `easyrice status` — display per-app change status
7. `easyrice commit` — interactive or direct commit of changes
8. Update website docs to match new CLI commands

### Phase 2: CLI Sharing (push → try)

9. `easyrice connect` — GitHub device flow auth
10. `easyrice push` — push managed repo to GitHub
11. `easyrice try <branch>` — switch between own branches
12. `easyrice try <github-url>` — try someone else's rice via temp branch
13. `easyrice try --revert` — revert to previous branch, delete temp
14. `easyrice screenshot` — capture and commit screenshots

### Phase 3: Website — Data Layer

15. Add new DB tables (rice, rice_branch, star) with Drizzle migrations
16. API routes for rice CRUD, starring, syncing
17. GitHub API integration layer with caching
18. CLI auth token generation endpoint

### Phase 4: Website — Frontend

19. Homepage redesign with hero, featured rices, how-it-works
20. `/explore` gallery with filtering, search, sorting
21. Rice detail page with screenshot viewer and branch selector
22. User dashboard with repo management and sync
23. Connect-a-repo wizard
24. Enhanced user profiles showing their rices and stars

### Phase 5: Distribution & Polish

25. Install script (`curl -fsSL https://easyrice.sh/install | bash`)
26. `rice` symlink auto-creation during install
27. Makefile for multi-arch Linux builds (amd64, arm64)
28. AUR package (PKGBUILD)
29. Nix package
30. GitHub Actions for automated CLI releases
