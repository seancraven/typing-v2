# [ProgramType](https://programtype.com)

Please try the website out by clicking the link above.

### Why I wrote this?

I typed out most of the code in languages I'm familiar with on [speedcoder](https://www.speedcoder.net/lessons/py/1/#google_vignette) and other similar sites. I like to practice typing, and I can write code, so I thought I would solve my problem, while teaching myself frontend.

LLMs are very good at generating code, so I decided to use them to generate the typing content for this project.

[!NOTE] Also I wanted to use European Infra as much as I could, so I used hetzner, which is alright.


## Architecture

Light frontend, that does dashboard + very interactive page, where you type.

Backend, has a thread that checks if any user has typed most of the content, if so it generates more text by querying and prompting the cheapes gemini model. The rest of the server reads and writes to the DB based on user interactions.

## Reflections on the project
### Backend
- I really like actix web and sqlx. SQLX has some really slow behaviour with SQLite, and I woudn't use it again over rustsqlite, it add a lot of overhead, but the compile time correctness is really nice.
- Rust build times in github actions while cross compiling for arm64 is really slow (like an hour). Locally it's a few seconds. I could have written it in Go.
- I would generally in future write boring backend code in Go because of the build times.

### Frontend
- Using Shadcn UI is a huge win. The styling decisions made by the framework, make massive amounts of differnce when trying to make a consistent theme in the UI.
- I should have tested things a bit more on the frontend.

### Infrastructure
 - I should have spent the money on amd64 for the faster builds.
 - CD is quite good.


## TODO:
- [ ] ARGO 2 passowrd hashing and salting, along with reset emails.
- [ ] Date times with test.
## Overview

### Full Stack Development
```bash
# Development with Docker
docker-compose -f docker-compose-dev.yml up

# Production deployment
docker-compose up
```
