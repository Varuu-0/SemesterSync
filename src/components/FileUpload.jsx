import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, FileText, AlertCircle, CheckCircle2, Loader2, X, Sparkles, Hash, Type
} from 'lucide-react';
import { extractTextFromPDF, validateFile, formatFileSize } from '../utils/pdfParser';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function FileUpload({ onParseComplete }) {
  const [status, setStatus] = useState('idle'); // idle | validating | parsing | success | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);

  const handleParse = useCallback(async (acceptedFiles) => {
    setFiles(acceptedFiles);
    setError(null);
    setStatus('validating');
    setProgress(0);

    // Validate
    for (const f of acceptedFiles) {
      const validation = validateFile(f);
      if (!validation.valid) {
        setError(`${f.name}: ${validation.error}`);
        setStatus('error');
        return;
      }
    }

    // Parse concurrently
    setStatus('parsing');
    try {
      const totalFiles = acceptedFiles.length;
      let completedFiles = 0;

      const parsePromises = acceptedFiles.map(async (file) => {
        // Individual file progress isn't great for batch, so we just track file completion
        const parseResult = await extractTextFromPDF(file, () => {});
        completedFiles++;
        setProgress(Math.round((completedFiles / totalFiles) * 100));
        return { ...parseResult, fileName: file.name, fileSize: file.size };
      });

      const allResults = await Promise.all(parsePromises);

      setResults(allResults);
      setStatus('success');

      if (onParseComplete) {
        onParseComplete(allResults);
      }
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }, [onParseComplete]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      const errorMsg = rejection.errors.map(e => e.message).join(', ');
      setError(errorMsg);
      setStatus('error');
      return;
    }

    if (acceptedFiles.length > 0) {
      handleParse(acceptedFiles);
    }
  }, [handleParse]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 10,
    maxSize: 20 * 1024 * 1024,
    disabled: status === 'parsing',
  });

  const resetUpload = () => {
    setStatus('idle');
    setFiles([]);
    setError(null);
    setResults([]);
    setProgress(0);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Upload size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Upload Syllabus</h2>
          <p className="text-muted-foreground">Drop your syllabus PDFs and we'll extract everything automatically</p>
        </div>
      </div>

      <Card 
        {...getRootProps()} 
        className={`relative overflow-hidden transition-all duration-200 border-2 border-dashed bg-background/50 backdrop-blur-xl
          ${isDragActive ? 'border-primary bg-primary/5 scale-[1.02] shadow-xl' : 'border-border/50 hover:border-primary/50 hover:bg-muted/30'}
          ${isDragReject ? 'border-destructive bg-destructive/5' : ''}
          ${status === 'parsing' ? 'opacity-80 pointer-events-none' : ''}
          ${status === 'success' ? 'border-green-500/50 bg-green-500/5' : ''}
        `}
      >
        <CardContent className="flex flex-col items-center justify-center py-16 text-center cursor-pointer min-h-[300px]">
          <input {...getInputProps()} id="file-input" />
          
          {status === 'idle' && !isDragActive && (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Upload size={32} className="text-primary animate-pulse" style={{ animationDuration: '3s' }} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-semibold">Drag & drop your syllabi</h3>
                <p className="text-muted-foreground">or <span className="text-primary font-medium hover:underline">browse files</span></p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Badge variant="secondary">PDF</Badge>
                <span className="text-xs text-muted-foreground">Up to 10 files, 20MB max</span>
              </div>
            </div>
          )}

          {isDragActive && !isDragReject && (
            <div className="space-y-4 text-primary animate-in fade-in zoom-in duration-200">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
                <Sparkles size={40} className="animate-bounce" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Drop it right here!</h3>
                <p className="opacity-80">We'll take care of the rest</p>
              </div>
            </div>
          )}

          {isDragReject && (
            <div className="space-y-4 text-destructive animate-in fade-in zoom-in duration-200">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/20">
                <AlertCircle size={40} />
              </div>
              <div>
                <h3 className="text-2xl font-bold">Unsupported file type</h3>
                <p className="opacity-80">Please upload PDF files only</p>
              </div>
            </div>
          )}

          {status === 'parsing' && (
            <div className="w-full max-w-sm mx-auto space-y-6 animate-in fade-in duration-300">
              <Loader2 size={48} className="mx-auto text-primary animate-spin" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-foreground">Extracting text from {files.length} file(s)...</h3>
                <Progress value={progress} className="h-2 w-full" />
                <p className="text-sm text-muted-foreground font-medium">{progress}% complete</p>
              </div>
            </div>
          )}

          {status === 'success' && results.length > 0 && (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300 flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h3 className="text-2xl font-semibold text-foreground">
                Successfully parsed {results.length} file{results.length > 1 ? 's' : ''}!
              </h3>
              
              <div className="flex flex-col items-center gap-2">
                {results.slice(0, 3).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-muted-foreground text-sm">
                    <FileText size={16} />
                    <span className="font-medium text-foreground">{r.fileName}</span>
                  </div>
                ))}
                {results.length > 3 && (
                  <span className="text-xs text-muted-foreground pt-1">+ {results.length - 3} more files</span>
                )}
              </div>

              <div className="flex items-center gap-6 py-4 px-8 rounded-xl bg-muted/50 border border-border">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold font-mono text-primary">{results.reduce((sum, r) => sum + r.totalPages, 0)}</span>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Pages</span>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl font-bold font-mono text-primary">{results.reduce((sum, r) => sum + r.totalWords, 0).toLocaleString()}</span>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Words</span>
                </div>
              </div>

              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); resetUpload(); }} className="mt-4">
                <X size={16} className="mr-2" />
                Upload different files
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {status === 'error' && (
        <div className="flex items-center justify-between p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} />
            <span className="font-medium">{error}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={resetUpload} className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <X size={18} />
          </Button>
        </div>
      )}
    </div>
  );
}
