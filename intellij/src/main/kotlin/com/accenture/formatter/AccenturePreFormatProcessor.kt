package com.accenture.formatter

import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.editor.Document
import com.intellij.openapi.util.TextRange
import com.intellij.lang.ASTNode
import com.intellij.psi.PsiDocumentManager
import com.intellij.psi.PsiFile
import com.intellij.psi.impl.source.codeStyle.PreFormatProcessor

class AccenturePreFormatProcessor : PreFormatProcessor {
    override fun process(element: ASTNode, range: TextRange): TextRange {
        val psiFile: PsiFile = element.psi?.containingFile ?: return range
        val fileName = psiFile.name
        if (!fileName.endsWith(".java", ignoreCase = true)) {
            return range
        }

        val project = psiFile.project
        val documentManager = PsiDocumentManager.getInstance(project)
        val document: Document = documentManager.getDocument(psiFile) ?: return range

        val originalText = document.text
        val config = AccentureFormatterConfig()
        val formattedText = AccentureJavaFormatter.format(originalText, config)

        if (formattedText != originalText) {
            WriteCommandAction.runWriteCommandAction(project) {
                document.setText(formattedText)
                documentManager.commitDocument(document)
            }
            return TextRange(0, formattedText.length)
        }

        return range
    }
}
