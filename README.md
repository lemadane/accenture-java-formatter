# Accenture Java Formatter for Visual Studio Code

![Accenture Java Formatter Icon](icon.png)

> Enterprise-grade Java Code Formatter for Visual Studio Code, modeled after **Language Support for Java(TM) by Red Hat** (`redhat.java`).

> [!IMPORTANT]
> **🧪 Beta Test Release**: This extension is currently under active **Beta Testing**. Features and formatting rules undergo continuous testing and validation. Feedback and issue reports are welcome!

The **Accenture Java Formatter** brings standardized Java code formatting, 2x continuation indentation, Eclipse JDT XML profile compatibility, intelligent import organization, and configurable code styles directly to Visual Studio Code.


---

## 💻 Local Installation Instructions

### Option 1: Via Terminal / Command Line (Quickest) 🚀

Execute the following command in your terminal:

```bash
code --install-extension /home/lem/Projects/vscode-java-formatter/accenture-java-formatter-0.9.2.vsix
```

### Option 2: Via VS Code GUI 🖥️

1. Open **Visual Studio Code**.
2. Open the **Extensions** side bar (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3. Click the **`...` (Views and More Actions)** menu icon at the top right of the Extensions panel.
4. Select **Install from VSIX...**.
5. Browse to `/home/lem/Projects/vscode-java-formatter/` and select `accenture-java-formatter-0.9.2.vsix`.


6. Click **Install**.

### Option 3: Run from Source Code (Development / Debug Mode) 🛠️

1. Open the project directory `/home/lem/Projects/vscode-java-formatter` in VS Code.
2. Press **`F5`** (or select **Run -> Start Debugging**).
3. A new **Extension Development Host** VS Code window will open with the extension active for live testing and development.

---

## 🌟 Standard Accenture Formatting Rules

| Rule | Description | Code Example |
| :--- | :--- | :--- |
| **Rule 1** | Any annotation sits on its own dedicated line (preserving method header prefixes). | `@PostMapping`<br>`@Validated`<br>`public ResponseEntity<ProductResponse> create(` |
| **Rule 4** | Method and constructor declarations with $>1$ argument formatted 1 per line. | `public int add(`<br>`    int a,`<br>`    int b) {` |
| **Rule 5** | `extends`, `implements`, `throws` sit on dedicated next lines together with associated types. | `public class CustomController`<br>`    extends BaseController`<br>`    implements ControllerInterface {` |
| **Rule 6** | Method calls with $>1$ argument formatted multiline (1 per line). | `service.pay(`<br>`    id,`<br>`    amount);` |
| **Rule 7** | Assignment RHS indented 2x (+4 spaces) when on next line & spaces around `=` normalized (`location = URI`). | `final var product =`<br>`    this.productService.create(request);`<br>`final var product`<br>`    = productService.create(request);` |
| **Rule 8** | Chained method calls ($\ge 2$ dots) split from 2nd dot, and lambda chained calls indented 2x (+4 spaces). | `return this.productService.getById(id)`<br>`    .map(ResponseEntity::ok)`<br>`    .orElseGet(() -> ResponseEntity`<br>`        .notFound()`<br>`        .build());` |
| **Rule 9** | 80-column line limit wraps assignment RHS or method arguments onto next line. | `maxLineLength: 80` |
| **Rule 10** | Automatic formatting triggered on document save. | `onSave: true`, `formatOnChange: false` |

---

## ⚙️ Configuration Settings

Configure options in `.vscode/settings.json` or the VS Code Settings UI:

```json
{
  "accentureJava.format.enabled": true,
  "accentureJava.format.preset": "Accenture Standard",
  "accentureJava.format.tabSize": 2,
  "accentureJava.format.insertSpaces": true,
  "accentureJava.format.maxLineLength": 80,
  "accentureJava.format.comments.enabled": true,
  "accentureJava.format.imports.organizeOnFormat": true,
  "accentureJava.format.formatOnChange": false,
  "accentureJava.format.onSave": true,
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
| **Accenture Java Formatter: Select Formatting Profile** | `accentureJava.format.selectProfile` | Quick-pick style profile menu |
| **Accenture Java Formatter: Export Default Accenture XML Config** | `accentureJava.format.exportConfig` | Generates `.vscode/accenture-java-formatter.xml` profile |

---

## 🛠️ Testing, Building & Packaging (.vsix)

```bash
# 1. Compile TypeScript
npm run compile

# 2. Execute 27-Test E2E & Unit Suite (2-State Testing Verified)
npm test

# 3. Package extension into .vsix installer
npm run package
```

---

## 📜 License

Copyright © 2026 Accenture. All Rights Reserved.
