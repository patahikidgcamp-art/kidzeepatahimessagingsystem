import React, { useRef, useState } from 'react';
import {
  StudentRecord,
  MessageTemplate,
  TemplateDesignConfig,
  TemplateThemeId,
  TemplateBorderStyle,
} from '../types';
import { TEMPLATE_VARIABLES, formatCurrency } from '../utils/templateEngine';
import { ParentPhonePreview } from './ParentPhonePreview';
import {
  FileText,
  Plus,
  Trash2,
  Sparkles,
  Smartphone,
  Code2,
  Layers,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Palette,
  LayoutTemplate,
} from 'lucide-react';

interface TemplateCustomizerProps {
  templates: MessageTemplate[];
  activeTemplateId: string;
  onSelectTemplate: (id: string) => void;
  onUpdateTemplate: (template: MessageTemplate) => void;
  onCreateTemplate: (template: MessageTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  students: StudentRecord[];
  selectedStudentId: string;
  onSelectStudent: (id: string) => void;
  onOpenIndividualOverride: (student: StudentRecord) => void;
  onQuickSend: (student: StudentRecord, renderedText: string) => void;
}

const DESIGN_THEMES: Array<{
  id: TemplateThemeId;
  label: string;
  color: string;
  defaultHeader: string;
  defaultBorder: TemplateBorderStyle;
}> = [
  {
    id: 'emerald-crest',
    label: 'Emerald Crest',
    color: '#047857',
    defaultHeader: 'KIDZEE SCHOOL OFFICIAL NOTICE',
    defaultBorder: 'classic-line',
  },
  {
    id: 'royal-gold',
    label: 'Royal Gold',
    color: '#b45309',
    defaultHeader: '✦ KIDZEE SCHOOL CIRCULAR ✦',
    defaultBorder: 'double-ornate',
  },
  {
    id: 'urgent-crimson',
    label: 'Pending Dues Alert',
    color: '#be123c',
    defaultHeader: '***** PENDING DUES *****',
    defaultBorder: 'dues-alert-box',
  },
  {
    id: 'indigo-academic',
    label: 'Academic Star',
    color: '#1d4ed8',
    defaultHeader: 'ACADEMIC PROGRESS REPORT',
    defaultBorder: 'star-banner',
  },
  {
    id: 'minimal-clean',
    label: 'Minimal Clean',
    color: '#334155',
    defaultHeader: '',
    defaultBorder: 'none',
  },
];

const DEFAULT_DESIGN: TemplateDesignConfig = {
  theme: 'emerald-crest',
  borderStyle: 'classic-line',
  headerBadge: 'KIDZEE SCHOOL OFFICIAL NOTICE',
  footerSignature: 'Principal & Accounts Office, Kidzee School',
  accentColor: '#047857',
  includeRichFormatting: true,
};

export const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({
  templates,
  activeTemplateId,
  onSelectTemplate,
  onUpdateTemplate,
  onCreateTemplate,
  onDeleteTemplate,
  students,
  selectedStudentId,
  onSelectStudent,
  onOpenIndividualOverride,
  onQuickSend,
}) => {
  const activeTemplate =
    templates.find((t) => t.id === activeTemplateId) || templates[0];

  const selectedStudent =
    students.find((s) => s.id === selectedStudentId) || students[0];

  const currentDesign: TemplateDesignConfig = activeTemplate.design || DEFAULT_DESIGN;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showDesignPanel, setShowDesignPanel] = useState(true);
  const [tokenCategory, setTokenCategory] = useState<'ALL' | 'Student & Class' | 'Excel Dues & Monthly' | 'Academic & Remarks'>('ALL');

  const updateDesign = (patch: Partial<TemplateDesignConfig>) => {
    onUpdateTemplate({
      ...activeTemplate,
      design: {
        ...currentDesign,
        ...patch,
      },
    });
  };

  // Insert token or designer snippet at cursor
  const handleInsertToken = (token: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = activeTemplate.body;
    const newText = text.substring(0, start) + token + text.substring(end);

    onUpdateTemplate({
      ...activeTemplate,
      body: newText,
    });

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd =
          start + token.length;
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Wrap selection with rich text markers (*bold*, _italic_, __underline__, ~strike~, `mono`)
  const handleApplyFormatting = (
    prefix: string,
    suffix: string,
    placeholder: string
  ) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = activeTemplate.body;
    const selected = text.substring(start, end);

    const inner = selected.length > 0 ? selected : placeholder;
    // Toggle off if already wrapped with identical markers
    const alreadyWrapped =
      selected.length > prefix.length + suffix.length &&
      selected.startsWith(prefix) &&
      selected.endsWith(suffix);

    let replacement: string;
    let nextSelStart: number;
    let nextSelEnd: number;

    if (alreadyWrapped) {
      replacement = selected.slice(prefix.length, selected.length - suffix.length);
      nextSelStart = start;
      nextSelEnd = start + replacement.length;
    } else {
      replacement = `${prefix}${inner}${suffix}`;
      nextSelStart = start + prefix.length;
      nextSelEnd = nextSelStart + inner.length;
    }

    const newText = text.substring(0, start) + replacement + text.substring(end);
    onUpdateTemplate({
      ...activeTemplate,
      body: newText,
    });

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = nextSelStart;
        textareaRef.current.selectionEnd = nextSelEnd;
      }
    }, 0);
  };

  // Keyboard shortcuts Ctrl+B / Ctrl+I / Ctrl+U inside editor
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        handleApplyFormatting('*', '*', 'Bold Text');
      } else if (key === 'i') {
        e.preventDefault();
        handleApplyFormatting('_', '_', 'Italic Text');
      } else if (key === 'u') {
        e.preventDefault();
        handleApplyFormatting('__', '__', 'Underlined Text');
      }
    }
  };

  const handleCreateNewTemplate = () => {
    const newTpl: MessageTemplate = {
      id: `tpl-${Date.now()}`,
      name: 'Designer Pending Dues Notice',
      description: 'Designer template with Bold, Italic & Underline formatting',
      category: 'Dues & Fees',
      channel: 'WhatsApp',
      body: `Dear *{ParentName}*,\n\nThis is a __Pending Fee Reminder__ for *{StudentName}* (_Class: {Grade}_, Roll: {RollNo}).\n\n• *Tuition Dues:* {TuitionDues}\n• *Transport Dues:* {TransportDues}\n• *TOTAL PAYABLE:* *{TotalDues}*\n\n{{#if dues}}Kindly clear the dues by __{DueDate}__. Pay online: {PaymentLink}{{/if}}\n\nThank you, *{SchoolName}*.`,
      design: {
        theme: 'urgent-crimson',
        borderStyle: 'dues-alert-box',
        headerBadge: '***** PENDING DUES *****',
        footerSignature: 'Accounts & Principal Office, Kidzee School',
        accentColor: '#be123c',
        includeRichFormatting: true,
      },
      enabledConditionals: {
        includeDuesSection: true,
        includeAttendanceWarning: false,
        includeTopSubjectPraise: false,
        includePaymentLink: true,
      },
    };
    onCreateTemplate(newTpl);
    onSelectTemplate(newTpl.id);
  };

  const charCount = activeTemplate?.body.length || 0;
  const smsSegments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Designer Template Editor (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        {/* Template Selector Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Designer Message Template Studio
              </h2>
              <p className="text-xs text-slate-500">
                Craft designer templates with Bold, Italic, Underline, decorative frames & live tokens
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeTemplateId}
              onChange={(e) => onSelectTemplate(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.channel})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleCreateNewTemplate}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Designer</span>
            </button>
          </div>
        </div>

        {/* Template Configuration Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          {/* Template Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={activeTemplate.name}
                onChange={(e) =>
                  onUpdateTemplate({ ...activeTemplate, name: e.target.value })
                }
                className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Channel
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateTemplate({ ...activeTemplate, channel: 'SMS' })
                  }
                  className={`py-1 text-xs font-semibold rounded-lg transition-all ${
                    activeTemplate.channel === 'SMS'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  SMS
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateTemplate({ ...activeTemplate, channel: 'WhatsApp' })
                  }
                  className={`py-1 text-xs font-semibold rounded-lg transition-all ${
                    activeTemplate.channel === 'WhatsApp'
                      ? 'bg-white text-emerald-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  WhatsApp
                </button>
              </div>
            </div>
          </div>

          {/* Designer Card & Theme Customizer */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-emerald-600" />
                Designer Style, Header Badge & Border Frame
              </span>
              <button
                type="button"
                onClick={() => setShowDesignPanel((v) => !v)}
                className="text-[11px] font-semibold text-emerald-700 hover:underline"
              >
                {showDesignPanel ? 'Hide Designer' : 'Customize Design'}
              </button>
            </div>

            {showDesignPanel && (
              <div className="space-y-3 pt-1">
                {/* Theme Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {DESIGN_THEMES.map((theme) => {
                    const active = currentDesign.theme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() =>
                          updateDesign({
                            theme: theme.id,
                            accentColor: theme.color,
                            headerBadge: theme.defaultHeader,
                            borderStyle: theme.defaultBorder,
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all ${
                          active
                            ? 'bg-white border-slate-900 text-slate-900 shadow-2xs ring-1 ring-slate-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: theme.color }}
                        />
                        <span>{theme.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Frame + Header Badge + Footer Signature */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Frame / Border Style
                    </label>
                    <select
                      value={currentDesign.borderStyle}
                      onChange={(e) =>
                        updateDesign({
                          borderStyle: e.target.value as TemplateBorderStyle,
                          fullBorderBox:
                            e.target.value === 'full-box' ? true : currentDesign.fullBorderBox,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
                    >
                      <option value="full-box">All-Over Full Message Box (┏━ ┃ ━┛)</option>
                      <option value="classic-line">Classic Hairline Banner</option>
                      <option value="double-ornate">Double Ornate Box</option>
                      <option value="star-banner">Star Crest Banner</option>
                      <option value="dues-alert-box">***** Pending Dues ***** Box</option>
                      <option value="none">No Border Frame</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Designer Header Title
                    </label>
                    <input
                      type="text"
                      value={currentDesign.headerBadge || ''}
                      onChange={(e) => updateDesign({ headerBadge: e.target.value })}
                      placeholder="e.g. ***** PENDING DUES *****"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Footer Signature
                    </label>
                    <input
                      type="text"
                      value={currentDesign.footerSignature || ''}
                      onChange={(e) => updateDesign({ footerSignature: e.target.value })}
                      placeholder="e.g. Principal, Kidzee School"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-800"
                    />
                  </div>
                </div>

                {/* All-Over Message Border Toggle */}
                <label className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">
                      Wrap Entire Message in All-Over Box Border
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Surrounds top, every body line, and footer with a continuous decorative border box.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(currentDesign.fullBorderBox || currentDesign.borderStyle === 'full-box')}
                    onChange={(e) =>
                      updateDesign({
                        fullBorderBox: e.target.checked,
                        borderStyle:
                          e.target.checked && currentDesign.borderStyle === 'none'
                            ? 'full-box'
                            : !e.target.checked && currentDesign.borderStyle === 'full-box'
                            ? 'classic-line'
                            : currentDesign.borderStyle,
                      })
                    }
                    className="w-4 h-4 rounded text-emerald-600"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Dynamic Excel Sheet & Student Variable Chips */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Insert Student &amp; Excel Sheet Tokens ({TEMPLATE_VARIABLES.length}):
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {(['ALL', 'Student & Class', 'Excel Dues & Monthly', 'Academic & Remarks'] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTokenCategory(cat)}
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap ${
                        tokenCategory === cat
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat === 'ALL' ? 'All Excel Columns' : cat}
                    </button>
                  )
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 max-h-44 overflow-y-auto">
              {TEMPLATE_VARIABLES.filter(
                (v) => tokenCategory === 'ALL' || v.category === tokenCategory
              ).map((v) => (
                <button
                  key={v.token}
                  type="button"
                  onClick={() => handleInsertToken(v.token)}
                  title={`${v.label}: ${v.desc}`}
                  className="px-2 py-1 text-[11px] font-mono font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 shadow-2xs transition-all"
                >
                  {v.token}
                </button>
              ))}
              {tokenCategory === 'ALL' &&
                (students.find((s) => (s.excelColumnOrder?.length ?? 0) > 0)?.excelColumnOrder || [])
                  .filter(
                    (col) =>
                      !TEMPLATE_VARIABLES.some(
                        (v) => v.token.toLowerCase() === `{${col.toLowerCase()}}`
                      )
                  )
                  .map((col) => (
                    <button
                      key={`excel-tok-${col}`}
                      type="button"
                      onClick={() => handleInsertToken(`{${col}}`)}
                      title={`Uploaded Excel column: ${col}`}
                      className="px-2 py-1 text-[11px] font-mono font-medium rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 shadow-2xs transition-all"
                    >
                      {`{${col}}`}
                    </button>
                  ))}
            </div>
          </div>

          {/* Conditional Logic Helpers */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Code2 className="w-3.5 h-3.5 text-amber-600" />
                Conditional Snippets:
              </span>
              <span className="text-[11px] text-slate-400">Shows section only if condition is met</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleInsertToken(
                    '{{#if dues}}Notice: Outstanding balance of *{DuesOwed}* is due by __{DueDate}__. Pay at {PaymentLink}{{/if}}'
                  )
                }
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors"
              >
                + Only if Dues Owed &gt; 0
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInsertToken(
                    '{{#if overdue}}*URGENT:* Fee payment of *{DuesOwed}* is __OVERDUE__ since {DueDate}. Please clear immediately.{{/if}}'
                  )
                }
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 transition-colors"
              >
                + Only if Overdue
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInsertToken(
                    '{{#if low_attendance}}_Attendance Warning:_ {StudentName} attendance has dropped to *{Attendance}*.{{/if}}'
                  )
                }
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-orange-50 border border-orange-200 text-orange-800 hover:bg-orange-100 transition-colors"
              >
                + Only if Attendance &lt; 85%
              </button>
              <button
                type="button"
                onClick={() =>
                  handleInsertToken(
                    '{{#if honors}}*Honor Roll Award:* Outstanding academic excellence with GPA *{GPA}*!{{/if}}'
                  )
                }
                className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                + Only if High GPA / Honors
              </button>
            </div>
          </div>

          {/* Rich Formatting Toolbar (Bold, Italic, Underline + Designer Snippets) */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-700">
                Rich Text Formatting & Message Body:
              </label>
              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                <span>{charCount} characters</span>
                {activeTemplate.channel === 'SMS' && (
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                    {smsSegments} SMS {smsSegments === 1 ? 'part' : 'parts'}
                  </span>
                )}
              </div>
            </div>

            {/* Toolbar Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900 text-white rounded-t-xl border border-slate-800">
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleApplyFormatting('*', '*', 'Bold Text')}
                  title="Bold (*text*) — Ctrl+B"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Bold className="w-3.5 h-3.5" />
                  <span>Bold</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyFormatting('_', '_', 'Italic Text')}
                  title="Italic (_text_) — Ctrl+I"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-white text-xs italic font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Italic className="w-3.5 h-3.5" />
                  <span>Italic</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyFormatting('__', '__', 'Underlined Text')}
                  title="Underline (__text__) — Ctrl+U (Auto-converts for WhatsApp!)"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-white text-xs underline font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Underline className="w-3.5 h-3.5" />
                  <span>Underline</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyFormatting('~', '~', 'Strike Text')}
                  title="Strikethrough (~text~)"
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs inline-flex items-center gap-1 transition-colors"
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyFormatting('`', '`', 'CODE')}
                  title="Monospace (`text`)"
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs inline-flex items-center gap-1 transition-colors"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1 flex-wrap text-[11px]">
                <button
                  type="button"
                  onClick={() => handleInsertToken('\n***** Pending Dues *****\n')}
                  className="px-2 py-1 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold border border-amber-500/30"
                >
                  + Pending Dues
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertToken('\n━━━━━━━━━━━━━━━━━━━━\n')}
                  className="px-2 py-1 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  + Divider
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertToken('✅ ')}
                  className="px-1.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
                  title="Insert Checkmark"
                >
                  ✅
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertToken('📌 ')}
                  className="px-1.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
                  title="Insert Pin"
                >
                  📌
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertToken('🏫 ')}
                  className="px-1.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700"
                  title="Insert School"
                >
                  🏫
                </button>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              rows={11}
              value={activeTemplate.body}
              onKeyDown={handleEditorKeyDown}
              onChange={(e) =>
                onUpdateTemplate({ ...activeTemplate, body: e.target.value })
              }
              className="w-full text-xs font-mono p-3.5 rounded-b-xl border border-t-0 border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 leading-relaxed text-slate-800 bg-slate-50/50"
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <LayoutTemplate className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Tip: Select text and press <strong>Ctrl+B</strong> (*bold*), <strong>Ctrl+I</strong> (_italic_), or <strong>Ctrl+U</strong> (__underline__). Underlined text converts cleanly for WhatsApp!
              </span>
            </p>
          </div>

          {/* Bottom actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              Designer layout & formatting auto-saved across sessions.
            </span>

            {templates.length > 1 && (
              <button
                type="button"
                onClick={() => onDeleteTemplate(activeTemplate.id)}
                className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded-lg hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Template
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Live Phone Mockup & Personalization Selector (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Student Selector Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              Preview with Student Data:
            </span>
            <span className="text-[11px] text-slate-400">
              {students.length} students loaded
            </span>
          </div>

          <select
            value={selectedStudentId}
            onChange={(e) => onSelectStudent(e.target.value)}
            disabled={students.length === 0}
            className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
          >
            {students.length === 0 ? (
              <option value="">No students in register (cleared)</option>
            ) : (
              students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.studentName} ({s.gradeLevel}, Roll: {s.rollNo}) • Total Dues: {formatCurrency(s.duesOwed)}
                </option>
              ))
            )}
          </select>

          {/* Quick Metrics of Selected Student */}
          {selectedStudent && (
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
              <div className="p-1.5 bg-slate-50 rounded-lg">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Mobile</div>
                <div className="text-xs font-mono font-medium text-slate-700 truncate">
                  {selectedStudent.parentMobile}
                </div>
              </div>
              <div className="p-1.5 bg-slate-50 rounded-lg">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Dues</div>
                <div
                  className={`text-xs font-mono font-bold ${
                    selectedStudent.duesOwed > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(selectedStudent.duesOwed)}
                </div>
              </div>
              <div className="p-1.5 bg-slate-50 rounded-lg">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">GPA / Attd</div>
                <div className="text-xs font-mono font-medium text-slate-700">
                  {selectedStudent.gpa} / {selectedStudent.attendanceRate}%
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Smartphone Simulator Preview */}
        {selectedStudent ? (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col items-center">
            <ParentPhonePreview
              student={selectedStudent}
              allStudents={students}
              template={activeTemplate}
              onEditStudentOverride={() => onOpenIndividualOverride(selectedStudent)}
              onSendSingleMessage={(student, text) => onQuickSend(student, text)}
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xs flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Smartphone className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">No Student Loaded for Preview</h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              All student records have been cleared. Reload the official 20 school records from the Student Database tab to preview phone personalization.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
