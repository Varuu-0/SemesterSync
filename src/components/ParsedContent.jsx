import { Loader2, FileText, Sparkles, Hash, Type, FileStack } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ParsedContent({ results, onExtract, extracting, aiStatus }) {
  if (!results || results.length === 0) return null;

  const totalPages = results.reduce((sum, r) => sum + r.totalPages, 0);
  const totalWords = results.reduce((sum, r) => sum + r.totalWords, 0);

  const handleExtractAll = () => {
    onExtract?.(results);
  };

  return (
    <Card className="w-full bg-background/50 backdrop-blur-xl border-primary/20 shadow-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileStack size={20} />
            </div>
            <div>
              <CardTitle>Ready for Extraction</CardTitle>
              <CardDescription>
                {results.length} file{results.length !== 1 ? 's' : ''} parsed and ready for AI analysis.
              </CardDescription>
            </div>
          </div>
          <Button
            size="lg"
            disabled={extracting}
            onClick={handleExtractAll}
            className="gap-2 shadow-lg shadow-primary/20"
          >
            {extracting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {aiStatus || 'Extracting...'}
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Extract All via AI
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Hash size={14} />
              <span className="text-xs uppercase tracking-wider font-semibold">Total Pages</span>
            </div>
            <span className="text-3xl font-bold font-mono text-foreground">{totalPages}</span>
          </div>
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/40 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Type size={14} />
              <span className="text-xs uppercase tracking-wider font-semibold">Total Words</span>
            </div>
            <span className="text-3xl font-bold font-mono text-foreground">{totalWords.toLocaleString()}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground mb-3 px-1">Files in queue</h4>
          <div className="grid gap-2">
            {results.map((res, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-primary/70" />
                  <span className="font-medium text-sm text-foreground truncate max-w-[200px] sm:max-w-xs">{res.fileName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs font-normal">
                    {res.totalPages} pg{res.totalPages !== 1 ? 's' : ''}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono w-16 text-right">
                    {res.totalWords.toLocaleString()} w
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
