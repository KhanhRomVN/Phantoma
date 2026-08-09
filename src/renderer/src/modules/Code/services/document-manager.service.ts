/**
 * Text Document Manager
 * 
 * Centralized document lifecycle management inspired by VSCode architecture.
 * Manages document references and coordinates LSP notifications.
 * 
 * Key concepts:
 * - Document lifecycle is independent of editor/component lifecycle
 * - Reference counting tracks how many components use each document
 * - didOpen sent only when first reference is added (refCount 0→1)
 * - didClose sent only when last reference is removed (refCount 1→0)
 * - Tab switches don't affect document state (refCount stays > 0)
 */

interface TextDocumentInfo {
  uri: string;
  languageId: string;
  version: number;
  refCount: number;
  model: any; // monaco.editor.ITextModel
  text: string;
}

class TextDocumentManager {
  private documents: Map<string, TextDocumentInfo> = new Map();

  /**
   * Add a reference to a document from a component.
   * Returns true if didOpen should be sent (first reference).
   * 
   * @param uri - Document URI (e.g., "file:///path/to/file.tsx")
   * @param languageId - Language ID (e.g., "typescriptreact")
   * @param model - Monaco text model
   * @param text - Document text content
   * @returns true if this is the first reference (should send didOpen)
   */
  addReference(uri: string, languageId: string, model: any, text: string): boolean {
    const doc = this.documents.get(uri);

    if (doc) {
      // Document already open, increment reference count
      doc.refCount++;
      console.log(`[DocumentManager] ✅ Added reference to ${this.getFileName(uri)} (refCount: ${doc.refCount})`);
      return false; // Don't send didOpen
    }

    // First reference - create new document entry
    this.documents.set(uri, {
      uri,
      languageId,
      version: 1,
      refCount: 1,
      model,
      text,
    });

    console.log(`[DocumentManager] 📂 First reference to ${this.getFileName(uri)} (refCount: 1) - SEND didOpen`);
    return true; // Send didOpen
  }

  /**
   * Remove a reference to a document from a component.
   * Returns true if didClose should be sent (last reference).
   * 
   * @param uri - Document URI
   * @returns true if this was the last reference (should send didClose)
   */
  removeReference(uri: string): boolean {
    const doc = this.documents.get(uri);
    if (!doc) {
      console.warn(`[DocumentManager] ⚠️  Attempted to remove reference to unopened document: ${uri}`);
      return false;
    }

    doc.refCount--;

    if (doc.refCount === 0) {
      // Last reference removed - clean up document
      this.documents.delete(uri);
      console.log(`[DocumentManager] 📄 Last reference to ${this.getFileName(uri)} removed (refCount: 0) - SEND didClose`);
      return true; // Send didClose
    }

    console.log(`[DocumentManager] ✅ Removed reference to ${this.getFileName(uri)} (refCount: ${doc.refCount}) - document still open`);
    return false; // Don't send didClose
  }

  /**
   * Update document version (for didChange notifications).
   * 
   * @param uri - Document URI
   * @returns new version number, or undefined if document not found
   */
  incrementVersion(uri: string): number | undefined {
    const doc = this.documents.get(uri);
    if (!doc) return undefined;

    doc.version++;
    return doc.version;
  }

  /**
   * Update document text content.
   * 
   * @param uri - Document URI
   * @param text - New text content
   */
  updateText(uri: string, text: string): void {
    const doc = this.documents.get(uri);
    if (doc) {
      doc.text = text;
    }
  }

  /**
   * Get document info.
   * 
   * @param uri - Document URI
   * @returns document info or undefined
   */
  getDocument(uri: string): TextDocumentInfo | undefined {
    return this.documents.get(uri);
  }

  /**
   * Check if document is open (has at least one reference).
   * 
   * @param uri - Document URI
   * @returns true if document is open
   */
  isDocumentOpen(uri: string): boolean {
    return this.documents.has(uri);
  }

  /**
   * Get current reference count for a document.
   * 
   * @param uri - Document URI
   * @returns reference count, or 0 if document not found
   */
  getRefCount(uri: string): number {
    return this.documents.get(uri)?.refCount ?? 0;
  }

  /**
   * Get all open document URIs.
   * 
   * @returns array of open document URIs
   */
  getOpenDocuments(): string[] {
    return Array.from(this.documents.keys());
  }

  /**
   * Get statistics for debugging.
   */
  getStats() {
    const docs = Array.from(this.documents.entries()).map(([uri, doc]) => ({
      file: this.getFileName(uri),
      refCount: doc.refCount,
      version: doc.version,
      languageId: doc.languageId,
    }));

    return {
      totalDocuments: this.documents.size,
      documents: docs,
    };
  }

  /**
   * Extract filename from URI for logging.
   */
  private getFileName(uri: string): string {
    const parts = uri.split('/');
    return parts[parts.length - 1] || uri;
  }

  /**
   * Clear all documents (for testing/cleanup).
   * WARNING: This does NOT send didClose notifications!
   */
  clearAll(): void {
    console.log(`[DocumentManager] 🧹 Clearing all documents (${this.documents.size} total)`);
    this.documents.clear();
  }
}

// Singleton instance
export const documentManager = new TextDocumentManager();

// Export type for external use
export type { TextDocumentInfo };
