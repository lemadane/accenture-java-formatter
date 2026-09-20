# Accenture Java Formatter for Visual Studio Code

![Accenture Java Formatter Icon](icon.png)

> Enterprise-grade Java Code Formatter for Visual Studio Code, modeled after **Language Support for Java(TM) by Red Hat** (`redhat.java`).

The **Accenture Java Formatter** brings standardized Java code formatting, Eclipse JDT XML profile compatibility, intelligent import organization, and configurable code styles directly to Visual Studio Code.

---

## 💻 Local Installation Instructions

### Option 1: Via Terminal / Command Line (Quickest) 🚀

Execute the following command in your terminal:

```bash
code --install-extension /home/lem/Projects/vscode-java-formatter/accenture-java-formatter-1.0.0.vsix
```

### Option 2: Via VS Code GUI 🖥️

1. Open **Visual Studio Code**.
2. Open the **Extensions** side bar (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3. Click the **`...` (Views and More Actions)** menu icon at the top right of the Extensions panel.
4. Select **Install from VSIX...**.
5. Browse to `/home/lem/Projects/vscode-java-formatter/` and select `accenture-java-formatter-1.0.0.vsix`.
6. Click **Install**.

### Option 3: Run from Source Code (Development / Debug Mode) 🛠️

1. Open the project directory `/home/lem/Projects/vscode-java-formatter` in VS Code.
2. Press **`F5`** (or select **Run -> Start Debugging**).
3. A new **Extension Development Host** VS Code window will open with the extension active for live testing and development.

---

## 🌟 Key Features

- 🎨 **Enterprise Java Formatting**: Formats classes, records, interfaces, enums, annotations (`@Entity`, `@Autowired`, `@Override`), control flows (`if/else`, `try/catch`, `switch`, `for`), lambdas, and Javadoc comments.
- 📐 **2-Space Default Indentation**: Pre-configured with clean 2-space indentation standards out of the box.
- 🔄 **Format on Code Change**: Automatically formats Java code as you type (with debounced performance protection).
- 📦 **Smart Import Organization**: Grouping and sorting of static, `java.*`, `javax.*/jakarta.*`, `org.*`, `com.*`, and `com.accenture.*` imports with automatic deduplication.
- ⚙️ **Eclipse JDT XML Profile Support**: Import custom Eclipse JDT XML formatting profiles (`accentureJava.format.settings.url`).
- 🎛️ **Pre-configured Style Presets**: Switch instantly between style profiles:
  - **Accenture Standard** (2 spaces, K&R braces, 120-char line limit, Accenture import grouping)
  - **Google Java Style** (2 spaces, strict Google Java style rules)
  - **Eclipse Default** (4-space tabs, Eclipse default conventions)
  - **Spring Framework Style** (4 spaces, Spring conventions)
- 📊 **Status Bar Indicator**: View and switch active formatting style profile directly from the status bar.

---

## ⚙️ Configuration Settings

Configure options in `.vscode/settings.json` or the VS Code Settings UI:

```json
{
  "accentureJava.format.enabled": true,
  "accentureJava.format.preset": "Accenture Standard",
  "accentureJava.format.tabSize": 2,
  "accentureJava.format.insertSpaces": true,
  "accentureJava.format.maxLineLength": 120,
  "accentureJava.format.comments.enabled": true,
  "accentureJava.format.imports.organizeOnFormat": true,
  "accentureJava.format.formatOnChange": true,
  "accentureJava.format.onSave": false,
  "accentureJava.format.settings.url": ".vscode/accenture-java-formatter.xml"
}
```

---

## 📜 Available Commands

| Command Title | Identifier | Description |
| :--- | :--- | :--- |
| **Accenture Java Formatter: Format Document** | `accentureJava.format.document` | Formats active Java file |
| **Accenture Java Formatter: Format Selection** | `accentureJava.format.selection` | Formats selected Java code |
| **Accenture Java Formatter: Organize Imports** | `accentureJava.format.organizeImports` | Cleans up & sorts Java imports |
| **Accenture Java Formatter: Select Formatting Profile** | `accentureJava.format.selectProfile` | Interactive quick-pick style profile menu |
| **Accenture Java Formatter: Export Default Accenture XML Config** | `accentureJava.format.exportConfig` | Generates `.vscode/accenture-java-formatter.xml` profile |

---

## 🛠️ Building & Packaging (.vsix)

```bash
# 1. Compile TypeScript
npm run compile

# 2. Execute E2E & Unit Test Suite
npm test

# 3. Package extension into .vsix installer
npm run package
```

---

## 🌿 Version Control

This repository is initialized with **Git** version control.

```bash
# Check version history and status
git log --oneline
```

### Version History
- **`v1.0.0`**: Initial release featuring Red Hat Java compatible architecture, Eclipse JDT XML profile loader, 2-space default indentation, format-on-change support, and unit/E2E test suite.

---

## 📜 License

Copyright © 2026 Accenture. All Rights Reserved.
