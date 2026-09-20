# Accenture Java Formatter for Visual Studio Code

> Enterprise-grade Java Code Formatter for Visual Studio Code, modeled after **Language Support for Java(TM) by Red Hat** (`redhat.java`).

The **Accenture Java Formatter** brings standardized Java code formatting, Eclipse JDT XML profile compatibility, intelligent import organization, and configurable code styles directly to Visual Studio Code.

---

## 🌟 Key Features

- 🎨 **Enterprise Java Formatting**: Formats classes, records, interfaces, enums, annotations (`@Entity`, `@Autowired`, `@Override`), control flows (`if/else`, `try/catch`, `switch`, `for`), lambdas, and Javadoc comments.
- 📦 **Smart Import Organization**: Grouping and sorting of static, `java.*`, `javax.*/jakarta.*`, `org.*`, `com.*`, and `com.accenture.*` imports with automatic deduplication.
- ⚙️ **Eclipse JDT XML Compatibility**: Full support for importing custom Eclipse JDT XML code formatting setting profiles (`accentureJava.format.settings.url`).
- 🎛️ **Pre-configured Style Presets**: Switch instantly between style profiles:
  - **Accenture Standard** (4 spaces, K&R braces, 120-char line limit, Accenture import grouping)
  - **Google Java Style** (2 spaces, strict Google Java style rules)
  - **Eclipse Default** (4-space tabs, Eclipse default conventions)
  - **Spring Framework Style** (4 spaces, Spring conventions)
- ⚡ **Format on Save & Range Formatting**: Seamless integration with VS Code's `editor.formatOnSave` and range selections.
- 📊 **Status Bar Profile Indicator**: View and switch active formatting profile with one click.

---

## 🚀 Quick Start & Usage

### Commands (Command Palette: `Ctrl+Shift+P` / `Cmd+Shift+P`)

| Command | Identifier | Description |
| :--- | :--- | :--- |
| **Accenture Java Formatter: Format Document** | `accentureJava.format.document` | Formats the active Java file |
| **Accenture Java Formatter: Format Selection** | `accentureJava.format.selection` | Formats the selected lines of Java code |
| **Accenture Java Formatter: Organize Imports** | `accentureJava.format.organizeImports` | Sorts & cleans up Java import statements |
| **Accenture Java Formatter: Select Formatting Profile** | `accentureJava.format.selectProfile` | Opens quick-pick menu to change active style preset |
| **Accenture Java Formatter: Export Default Accenture XML Config** | `accentureJava.format.exportConfig` | Creates `.vscode/accenture-java-formatter.xml` profile in workspace |

---

## 🔧 Configuration Settings

Configure settings in `.vscode/settings.json` or VS Code Settings UI:

```json
{
  "accentureJava.format.enabled": true,
  "accentureJava.format.preset": "Accenture Standard",
  "accentureJava.format.tabSize": 2,
  "accentureJava.format.insertSpaces": true,
  "accentureJava.format.maxLineLength": 120,
  "accentureJava.format.comments.enabled": true,
  "accentureJava.format.imports.organizeOnFormat": true,
  "accentureJava.format.onSave": true,
  "accentureJava.format.settings.url": ".vscode/accenture-java-formatter.xml"
}
```

---

## 🛠️ Building & Packaging (.vsix)

To compile and package the extension into a `.vsix` installer file:

```bash
# 1. Install dependencies
npm install

# 2. Compile TypeScript
npm run compile

# 3. Package extension
npm run package
```

---

## 📜 License

Copyright © 2026 Accenture. All Rights Reserved.
