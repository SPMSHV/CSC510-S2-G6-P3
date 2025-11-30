# Contributing to BiteCode

🎉 First off, thanks for taking the time to contribute! We love your enthusiasm for improving BiteCode — every bug fix, feature, and idea helps us make the project better.

The following is a set of guidelines for contributing to BiteCode, adapted from [Probot’s contributing guide](https://github.com/probot/template/blob/master/CONTRIBUTING.md).

---

## 🧭 Table of Contents
1. How Can I Contribute?
2. Code of Conduct
3. Reporting Bugs
4. Suggesting Enhancements
5. Development Setup
6. Pull Request Process
7. Style Guide

---

## 💡 How Can I Contribute?

There are many ways to contribute to BiteCode:

- Submitting bug reports or feature requests
- Writing or improving documentation
- Designing UI improvements or mockups
- Fixing typos or improving code readability
- Adding automated tests or improving existing ones
- Sharing feedback and helping new contributors

No contribution is too small — every bit helps!

---

## 🤝 Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md).  
By participating, you agree to uphold this code and foster an inclusive, welcoming environment.

---

## 🐛 Reporting Bugs

Before reporting a bug, please:
1. Check the [Issues](https://github.com/yourusername/proj2/issues) page to ensure it hasn’t already been reported.
2. If not found, open a new issue with the following details:
   - Clear title and description
   - Steps to reproduce the bug
   - Expected vs actual behavior
   - Screenshots or logs (if applicable)
   - Environment details (OS, Node.js version, browser, etc.)

Example issue title:
> 🐞 Bug: Cart total not updating after item removal

---

## 💭 Suggesting Enhancements

We welcome feature ideas and suggestions! Please include:

- **Summary:** What’s the new feature or improvement?
- **Motivation:** Why is this useful or important?
- **Implementation idea:** Optional, but helpful if you have one.

Example feature request:
> ✨ Feature: Add a timer-based challenge pop-up when order is placed.

---

## 🧑‍💻 Development Setup

1. Fork the repository and clone your fork:
   ```bash
   git clone https://github.com/yourusername/proj2.git
   cd proj2
   ```
2. Install dependencies for each module:
   ```bash
   cd food-delivery && npm install
   cd ../judge0-frontend && npm install
   ```
3. Start local development servers:
   ```bash
   npm run dev
   ```
4. Make changes in a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

---

## 🔄 Pull Request Process

1. Ensure all tests pass locally.
2. Update documentation if your change affects the UI or API.
3. Use a **descriptive PR title** (e.g., “Add restaurant rewards feature”).
4. Reference any related issues using `Fixes #issue-number`.
5. Request a review from a project maintainer.

Example PR title:
> 🚀 Add leaderboard API integration

---

### Commits
Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:
```
feat: add menu filtering by category
fix: resolve crash on invalid restaurant ID
docs: update setup steps in README
```

### Comments
- Use clear, concise language.
- Prefer descriptive variable names over comments when possible.

---

## 🧾 License

By contributing to BiteCode, you agree that your contributions will be licensed under the [MIT License](./LICENSE).

---

✅ *Thank you for contributing — your work helps BiteCode grow and inspire others!*
