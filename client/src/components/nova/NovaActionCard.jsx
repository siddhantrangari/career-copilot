import React, { useState } from 'react';
import { 
  FileText, Award, Users, DollarSign, Copy, Check, 
  Download, ArrowRight, ChevronLeft, ChevronRight, Sparkles 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function NovaActionCard({ actionType, actionData, onNavigate }) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);

  if (!actionType || !actionData) return null;

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    confetti({ particleCount: 25, spread: 45, origin: { y: 0.8 } });
  };

  const handleDownload = (content, filename) => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // 1. Tailored Resume Action Card
  if (actionType === 'tailored_resume') {
    const resumeText = actionData.tailored_markdown_resume || `# ${actionData.target_role || 'Tailored Resume'}\n\n### Summary\n${actionData.tailored_summary}\n\n### Experience\n` +
      (actionData.tailored_bullets_by_role || []).map(r => `**${r.company}** (${r.role || ''})\n` + (r.bullets || []).map(b => `- ${b}`).join('\n')).join('\n\n');

    return (
      <div style={{
        marginTop: 14,
        background: 'linear-gradient(135deg, rgba(10,132,255,0.08) 0%, rgba(94,92,230,0.05) 100%)',
        border: '1px solid rgba(10,132,255,0.3)',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="apple-badge apple-badge-blue" style={{ fontSize: 11, padding: '4px 10px' }}>
              <FileText size={12} style={{ marginRight: 4 }} /> Tailored Resume Generated
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f5f5f7' }}>
              {actionData.target_company ? `${actionData.target_company} · ` : ''}{actionData.target_role || 'Target Role'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#8e8e93' }}>ATS Match:</span>
            <span className="apple-badge apple-badge-emerald" style={{ fontSize: 12, fontWeight: 800 }}>
              {actionData.old_ats_score ? `${actionData.old_ats_score}% → ` : ''}{actionData.new_ats_score || 96}%
            </span>
          </div>
        </div>

        {/* Added Keywords */}
        {actionData.added_keywords && actionData.added_keywords.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8e8e93', marginBottom: 6 }}>
              ✨ Added JD High-Weight Keywords:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {actionData.added_keywords.map((kw, idx) => (
                <span key={idx} className="apple-badge apple-badge-blue" style={{ fontSize: 11 }}>
                  +{kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tailored Summary */}
        {actionData.tailored_summary && (
          <div style={{
            background: 'rgba(0,0,0,0.35)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding: 12,
            marginBottom: 14,
            fontSize: 12,
            lineHeight: 1.6,
            color: '#d1d1d6',
          }}>
            <strong style={{ color: '#fff' }}>Executive Summary:</strong> {actionData.tailored_summary}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            id="nova-copy-resume-btn"
            className="apple-btn apple-btn-secondary"
            style={{ fontSize: 12, padding: '7px 14px' }}
            onClick={() => handleCopy(resumeText, 'resume')}
          >
            {copiedKey === 'resume' ? <Check size={13} color="#32d74b" /> : <Copy size={13} />}
            {copiedKey === 'resume' ? 'Copied Resume' : 'Copy Full Resume (Markdown)'}
          </button>

          <button
            id="nova-download-resume-btn"
            className="apple-btn apple-btn-secondary"
            style={{ fontSize: 12, padding: '7px 14px' }}
            onClick={() => handleDownload(resumeText, `Tailored_Resume_${actionData.target_company || 'Target'}.md`)}
          >
            <Download size={13} />
            Download .md
          </button>

          {onNavigate && (
            <button
              id="nova-goto-ats-btn"
              className="apple-btn apple-btn-primary"
              style={{ fontSize: 12, padding: '7px 14px', marginLeft: 'auto' }}
              onClick={() => onNavigate('ats')}
            >
              Open in ATS Studio
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // 2. Executive WIN Document Action Card
  if (actionType === 'win_deck') {
    const slides = actionData.slides || [];
    const currentSlide = slides[activeSlide] || slides[0] || {};
    const fullMarkdownDeck = `# ${actionData.deck_title || 'Executive 30-60-90 Day WIN Document'}\n\n` +
      `**Target Company:** ${actionData.target_company || ''} | **Target Role:** ${actionData.target_role || ''}\n\n` +
      `### Executive Summary\n${actionData.executive_summary || ''}\n\n` +
      slides.map(s => `## Slide ${s.slide_number}: ${s.title}\n*${s.subtitle || ''}*\n\n` +
        (s.key_points || []).map(p => `- ${p}`).join('\n') + '\n\n' +
        (s.deliverables ? `**Deliverables:**\n` + s.deliverables.map(d => `- ${d}`).join('\n') + '\n\n' : '') +
        (s.milestone ? `**Milestone:** ${s.milestone}\n\n` : '') +
        (s.business_roi ? `**Expected ROI:** ${s.business_roi}\n\n` : '')
      ).join('\n---\n\n');

    return (
      <div style={{
        marginTop: 14,
        background: 'linear-gradient(135deg, rgba(191,90,242,0.08) 0%, rgba(10,132,255,0.05) 100%)',
        border: '1px solid rgba(191,90,242,0.3)',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="apple-badge apple-badge-purple" style={{ fontSize: 11, padding: '4px 10px' }}>
              <Award size={12} style={{ marginRight: 4 }} /> 30-60-90 WIN Document
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f5f5f7' }}>
              {actionData.deck_title || 'Executive Strategy Deck'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="apple-badge apple-badge-blue" style={{ fontSize: 11 }}>
              {slides.length || 5} Executive Slides
            </span>
          </div>
        </div>

        {/* Slide Carousel Viewer */}
        {slides.length > 0 && (
          <div style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="apple-badge apple-badge-purple" style={{ fontSize: 10 }}>
                  Slide {currentSlide.slide_number || activeSlide + 1} of {slides.length}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                  {currentSlide.title}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  id="win-prev-slide-btn"
                  className="apple-btn apple-btn-secondary"
                  style={{ padding: '4px 8px', fontSize: 11 }}
                  disabled={activeSlide === 0}
                  onClick={() => setActiveSlide(prev => Math.max(0, prev - 1))}
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  id="win-next-slide-btn"
                  className="apple-btn apple-btn-secondary"
                  style={{ padding: '4px 8px', fontSize: 11 }}
                  disabled={activeSlide === slides.length - 1}
                  onClick={() => setActiveSlide(prev => Math.min(slides.length - 1, prev + 1))}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {currentSlide.subtitle && (
              <div style={{ fontSize: 11, color: '#8e8e93', fontStyle: 'italic', marginBottom: 10 }}>
                {currentSlide.subtitle}
              </div>
            )}

            <ul style={{ paddingLeft: 18, fontSize: 12, color: '#d1d1d6', lineHeight: 1.6, marginBottom: 10 }}>
              {(currentSlide.key_points || []).map((pt, pIdx) => (
                <li key={pIdx} style={{ marginBottom: 4 }}>{pt}</li>
              ))}
            </ul>

            {currentSlide.deliverables && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#5ac8fa', marginBottom: 4 }}>Key Deliverables:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {currentSlide.deliverables.map((del, dIdx) => (
                    <span key={dIdx} className="apple-badge apple-badge-blue" style={{ fontSize: 10 }}>
                      ✓ {del}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {currentSlide.milestone && (
              <div style={{ fontSize: 11, color: '#32d74b', marginTop: 8 }}>
                🎯 <strong>Milestone:</strong> {currentSlide.milestone}
              </div>
            )}

            {currentSlide.business_roi && (
              <div style={{ fontSize: 11, color: '#ffd60a', marginTop: 8 }}>
                💰 <strong>Business ROI:</strong> {currentSlide.business_roi}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            id="nova-copy-win-btn"
            className="apple-btn apple-btn-secondary"
            style={{ fontSize: 12, padding: '7px 14px' }}
            onClick={() => handleCopy(fullMarkdownDeck, 'win')}
          >
            {copiedKey === 'win' ? <Check size={13} color="#32d74b" /> : <Copy size={13} />}
            {copiedKey === 'win' ? 'Copied Full Deck' : 'Copy Strategy Deck'}
          </button>

          <button
            id="nova-download-win-btn"
            className="apple-btn apple-btn-secondary"
            style={{ fontSize: 12, padding: '7px 14px' }}
            onClick={() => handleDownload(fullMarkdownDeck, `Win_Document_${actionData.target_company || 'Strategy'}.md`)}
          >
            <Download size={13} />
            Download .md Deck
          </button>

          {onNavigate && (
            <button
              id="nova-goto-executive-btn"
              className="apple-btn apple-btn-primary"
              style={{ fontSize: 12, padding: '7px 14px', marginLeft: 'auto' }}
              onClick={() => onNavigate('executive')}
            >
              Open Executive Suite
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. LinkedIn Networking Sequence Card
  if (actionType === 'networking_sequence') {
    return (
      <div style={{
        marginTop: 14,
        background: 'linear-gradient(135deg, rgba(10,132,255,0.08) 0%, rgba(50,215,75,0.05) 100%)',
        border: '1px solid rgba(10,132,255,0.3)',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className="apple-badge apple-badge-blue" style={{ fontSize: 11 }}>
            <Users size={12} style={{ marginRight: 4 }} /> 3-Level LinkedIn Sequence
          </span>
          <span style={{ fontSize: 12, color: '#8e8e93' }}>
            {actionData.target_name ? `Target: ${actionData.target_name}` : 'Hiring Manager Outreach'}
          </span>
        </div>

        {/* Level 1 */}
        {actionData.level_1 && (
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#5ac8fa' }}>Level 1: Connection Note (&lt;280 chars)</span>
              <button
                id="copy-l1-btn"
                className="apple-btn apple-btn-secondary"
                style={{ padding: '3px 8px', fontSize: 10 }}
                onClick={() => handleCopy(actionData.level_1.message, 'l1')}
              >
                {copiedKey === 'l1' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#f5f5f7', lineHeight: 1.5 }}>
              "{actionData.level_1.message}"
            </div>
          </div>
        )}

        {/* Level 2 */}
        {actionData.level_2 && (
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#32d74b' }}>Level 2: Post-Accept InMail / DM</span>
              <button
                id="copy-l2-btn"
                className="apple-btn apple-btn-secondary"
                style={{ padding: '3px 8px', fontSize: 10 }}
                onClick={() => handleCopy(actionData.level_2.message, 'l2')}
              >
                {copiedKey === 'l2' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#f5f5f7', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {actionData.level_2.message}
            </div>
          </div>
        )}

        {/* Level 3 */}
        {actionData.level_3 && (
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#ffd60a' }}>Level 3: Follow-Up Bump (7-10 days later)</span>
              <button
                id="copy-l3-btn"
                className="apple-btn apple-btn-secondary"
                style={{ padding: '3px 8px', fontSize: 10 }}
                onClick={() => handleCopy(actionData.level_3.message, 'l3')}
              >
                {copiedKey === 'l3' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div style={{ fontSize: 12, color: '#f5f5f7', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {actionData.level_3.message}
            </div>
          </div>
        )}

        {onNavigate && (
          <button
            id="nova-goto-networker-btn"
            className="apple-btn apple-btn-primary"
            style={{ width: '100%', fontSize: 12, padding: '8px 14px' }}
            onClick={() => onNavigate('networker')}
          >
            Open Networker Radar & Launch Sequence
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    );
  }

  // 4. Salary Negotiation Playbook Card
  if (actionType === 'salary_playbook') {
    return (
      <div style={{
        marginTop: 14,
        background: 'linear-gradient(135deg, rgba(255,214,10,0.08) 0%, rgba(50,215,75,0.05) 100%)',
        border: '1px solid rgba(255,214,10,0.3)',
        borderRadius: 16,
        padding: 20,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className="apple-badge apple-badge-amber" style={{ fontSize: 11 }}>
            <DollarSign size={12} style={{ marginRight: 4 }} /> Salary Counter-Offer Playbook
          </span>
        </div>

        {actionData.email_script && (
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#ffd60a' }}>Formal Email Counter-Offer Script</span>
              <button
                id="copy-salary-email-btn"
                className="apple-btn apple-btn-secondary"
                style={{ padding: '3px 8px', fontSize: 10 }}
                onClick={() => handleCopy(actionData.email_script, 'email')}
              >
                {copiedKey === 'email' ? 'Copied' : 'Copy Email'}
              </button>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#f5f5f7', lineHeight: 1.5, fontFamily: 'inherit' }}>
              {actionData.email_script}
            </pre>
          </div>
        )}

        {actionData.phone_script && (
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#5ac8fa' }}>Verbal Phone Script Talking Points</span>
              <button
                id="copy-salary-phone-btn"
                className="apple-btn apple-btn-secondary"
                style={{ padding: '3px 8px', fontSize: 10 }}
                onClick={() => handleCopy(actionData.phone_script, 'phone')}
              >
                {copiedKey === 'phone' ? 'Copied' : 'Copy Points'}
              </button>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#f5f5f7', lineHeight: 1.5, fontFamily: 'inherit' }}>
              {actionData.phone_script}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return null;
}
