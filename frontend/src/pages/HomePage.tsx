import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Wand2, HelpCircle, AlertTriangle, User, Lightbulb, Flame, BookOpen, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner, SkeletonCard, SkeletonBlueprint } from '@/components/ui/Loading';
import { BlueprintCard } from '@/components/BlueprintCard';
import { useToast } from '@/context/ToastContext';
import { generateIdeas, generateScript, type Idea, type Script } from '@/lib/api';

const IDEA_TYPES: { label: string; icon: LucideIcon }[] = [
  { label: 'سؤال', icon: HelpCircle },
  { label: 'غلط شائع', icon: AlertTriangle },
  { label: 'تجربة شخصية', icon: User },
  { label: 'نصيحة سريعة', icon: Lightbulb },
  { label: 'حقيقة صادمة', icon: Flame },
  { label: 'قصة قصيرة', icon: BookOpen },
];

interface ScriptResult {
  title: string;
  script: Script;
}

export function HomePage() {
  const { toast } = useToast();
  const [rawInput, setRawInput] = useState('');
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [scripts, setScripts] = useState<Map<number, ScriptResult>>(new Map());
  const [generatingAll, setGeneratingAll] = useState(false);

  // Generate ideas mutation
  const ideasMutation = useMutation({
    mutationFn: () => generateIdeas(rawInput, selectedType),
    onSuccess: (data) => {
      setIdeas(data.ideas);
      setScripts(new Map());
    },
    onError: (err: Error) => {
      toast(err.message, 'error');
    },
  });

  // Generate single script mutation
  const scriptMutation = useMutation({
    mutationFn: (input: string) => generateScript(input),
  });

  const handleGenerate = () => {
    if (!rawInput.trim()) {
      toast('اكتب فكرتك الأول', 'error');
      return;
    }
    ideasMutation.mutate();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleGenerateScript = async (index: number, idea: Idea) => {
    try {
      const input = `${idea.title}\n${idea.explanation}\nالزاوية: ${idea.angle}`;
      const data = await generateScript(input);
      setScripts((prev) => {
        const next = new Map(prev);
        next.set(index, { title: idea.title, script: data.script });
        return next;
      });
    } catch (err: any) {
      toast(err.message || 'فشل توليد السكريبت', 'error');
    }
  };

  const handleGenerateAll = async () => {
    if (!ideas) return;
    setGeneratingAll(true);
    try {
      const results = await Promise.all(
        ideas.map(async (idea, i) => {
          if (scripts.has(i)) return null;
          const input = `${idea.title}\n${idea.explanation}\nالزاوية: ${idea.angle}`;
          const data = await generateScript(input);
          return { index: i, title: idea.title, script: data.script };
        })
      );
      setScripts((prev) => {
        const next = new Map(prev);
        for (const r of results) {
          if (r) next.set(r.index, { title: r.title, script: r.script });
        }
        return next;
      });
      toast('تم توليد كل السكريبتات ✅', 'success');
    } catch (err: any) {
      toast(err.message || 'فشل توليد بعض السكريبتات', 'error');
    } finally {
      setGeneratingAll(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-primary-light text-primary px-4 py-1.5 rounded-full text-sm font-medium">
          <Sparkles className="w-4 h-4" />
          محرك المحتوى
        </div>
        <h1 className="text-xl sm:text-2xl font-bold">حوّل أفكارك لمحتوى جاهز للتصوير</h1>
        <p className="text-text-secondary text-xs sm:text-sm max-w-lg mx-auto">
          اكتب فكرتك الخام وهنحوّلها لـ 4 أفكار محتوى مختلفة مع سكريبتات كاملة
          جاهزة للتصوير
        </p>
      </div>

      {/* Input section */}
      <div className="bg-surface rounded-2xl p-4 sm:p-6 shadow-sm border border-border space-y-4">
        <label className="block text-sm font-semibold text-text">
          اكتب أفكارك الخام
        </label>
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="مثلاً: ليه الناس بتفشل في الـ interviews حتى لو شاطرين..."
          className="w-full h-32 px-4 py-3 rounded-xl border border-border bg-surface-elevated text-text text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-secondary/50"
          dir="auto"
        />

        {/* Idea type buttons */}
        <div className="space-y-2">
          <span className="text-xs text-text-secondary font-medium">
            نوع الفكرة (اختياري)
          </span>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {IDEA_TYPES.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() =>
                  setSelectedType(selectedType === label ? undefined : label)
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${
                  selectedType === label
                    ? 'bg-primary text-surface-alt border-primary'
                    : 'bg-surface-elevated text-text-secondary border-border hover:border-primary/30 hover:text-text'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <Button
          size="lg"
          onClick={handleGenerate}
          loading={ideasMutation.isPending}
          className="w-full"
        >
          <Wand2 className="w-5 h-5" />
          حوّل فكرتي لمحتوى
        </Button>
      </div>

      {/* Loading state for ideas */}
      {ideasMutation.isPending && (
        <div>
          <LoadingSpinner text="بنفكر في أفكار مختلفة..." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      )}

      {/* Ideas grid */}
      {ideas && !ideasMutation.isPending && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-bold">الأفكار المقترحة</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGenerateAll}
              loading={generatingAll}
              disabled={scripts.size === ideas.length}
            >
              <Wand2 className="w-4 h-4" />
              حوّل الكل لسكريبتات
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ideas.map((idea, i) => (
              <IdeaCard
                key={i}
                idea={idea}
                index={i}
                hasScript={scripts.has(i)}
                isGenerating={
                  scriptMutation.isPending &&
                  scriptMutation.variables ===
                    `${idea.title}\n${idea.explanation}\nالزاوية: ${idea.angle}`
                }
                onGenerate={() => handleGenerateScript(i, idea)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Scripts */}
      {scripts.size > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold">السكريبتات</h2>
          {Array.from(scripts.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([index, { title, script }]) => (
              <BlueprintCard key={index} title={title} script={script} />
            ))}
        </div>
      )}

      {/* Loading skeleton for single script generation during generateAll */}
      {generatingAll && scripts.size < (ideas?.length ?? 0) && (
        <div className="space-y-4">
          {Array.from(
            { length: (ideas?.length ?? 0) - scripts.size },
            (_, i) => (
              <SkeletonBlueprint key={i} />
            )
          )}
        </div>
      )}
    </div>
  );
}

// --- Idea Card sub-component ---

function IdeaCard({
  idea,
  index: _index,
  hasScript,
  isGenerating,
  onGenerate,
}: {
  idea: Idea;
  index: number;
  hasScript: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await onGenerate();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl p-4 sm:p-5 shadow-sm border border-border hover:border-primary/20 transition-all space-y-3">
      <h3 className="font-bold text-sm">{idea.title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed">
        {idea.explanation}
      </p>
      <div className="text-xs text-primary font-medium bg-primary-light px-3 py-1.5 rounded-lg inline-block">
        الزاوية: {idea.angle}
      </div>
      <div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClick}
          loading={loading || isGenerating}
          disabled={hasScript}
        >
          {hasScript ? 'جاهز ✅' : 'اكتب سكريبت'}
        </Button>
      </div>
    </div>
  );
}
