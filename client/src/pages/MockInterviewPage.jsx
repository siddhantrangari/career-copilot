import React, { useState, useEffect } from 'react';
import { AppleCard } from '../components/ui/AppleCard';
import { CircularGauge } from '../components/ui/CircularGauge';
import { api } from '../services/api';
import { 
  Mic, Sparkles, CheckCircle2, AlertCircle, ArrowRight, 
  RotateCcw, ThumbsUp, Lightbulb, Play 
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function MockInterviewPage() {
  const [targetRole, setTargetRole] = useState('Director of Engineering / Tech Lead');
  const [seniority, setSeniority] = useState('Senior / Lead');
  const [questions, setQuestions] = useState([]);
  const [activeQIndex, setActiveQIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  const loadQuestions = async () => {
    setLoadingQuestions(true);
    setEvaluation(null);
    setUserAnswer('');
    try {
      const data = await api.getInterviewQuestions({
        target_role: targetRole,
        seniority_level: seniority,
      });
      setQuestions(data.questions || []);
      setActiveQIndex(0);
    } catch (err) {
      alert('Failed to load questions: ' + err.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [targetRole, seniority]);

  const activeQuestion = questions[activeQIndex];

  const handleInsertSampleAnswer = () => {
    setUserAnswer(
      `At my previous company, we experienced a critical 45% spike in latency during the holiday flash sale. As engineering lead, my responsibility was resolving the bottleneck without shutting down services. I assembled a response squad, introduced distributed request tracing, and discovered a database lock contention in the checkout pipeline. I implemented Redis caching for inventory reads and refactored connection pooling, cutting latency by 65% and saving ₹1.2 Cr in prevented cart abandonments.`
    );
  };

  const handleEvaluate = async () => {
    if (!userAnswer || !activeQuestion) return;
    setEvaluating(true);
    try {
      const result = await api.evaluateAnswer({
        question: activeQuestion.question,
        user_answer: userAnswer,
        target_role: targetRole,
      });
      setEvaluation(result);
      confetti({ particleCount: 50, spread: 60 });
    } catch (err) {
      alert('Evaluation error: ' + err.message);
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '36px 24px 80px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="apple-badge apple-badge-purple">AI Mock Simulator</span>
            <span style={{ fontSize: '13px', color: 'var(--apple-text-secondary)' }}>Evaluated with gpt-5.6-sol</span>
          </div>
          <h1 className="headline-section" style={{ color: 'var(--nxt-text-primary)' }}>
            Executive Mock Interview & STAR Feedback
          </h1>
        </div>

        {/* Role Selectors */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            className="apple-input"
            style={{ width: 'auto' }}
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
          >
            <option value="Director of Engineering / Tech Lead">Director of Engineering</option>
            <option value="VP of Technology / Head of Engineering">VP of Technology</option>
            <option value="Principal Architect / Staff Engineer">Principal Architect</option>
            <option value="Product Engineering Manager">Product Engineering Manager</option>
          </select>

          <button
            className="apple-btn apple-btn-secondary"
            onClick={loadQuestions}
            disabled={loadingQuestions}
          >
            <RotateCcw size={14} />
            Regenerate
          </button>
        </div>
      </div>

      {loadingQuestions || !activeQuestion ? (
        <AppleCard style={{ padding: '60px', textAlign: 'center', color: 'var(--apple-text-secondary)' }}>
          Preparing executive bar-raiser interview questions...
        </AppleCard>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px', alignItems: 'start' }}>
          {/* Left: Active Question & Answer Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <AppleCard glow style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span className="apple-badge apple-badge-blue">
                  Question {activeQIndex + 1} of {questions.length} · {activeQuestion.category}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {questions.map((_, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => { setActiveQIndex(qIdx); setEvaluation(null); setUserAnswer(''); }}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: activeQIndex === qIdx ? 'var(--nxt-accent-blue)' : 'var(--nxt-bg-surface-subtle)',
                        color: activeQIndex === qIdx ? '#ffffff' : 'var(--nxt-text-secondary)',
                      }}
                    >
                      {qIdx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--nxt-text-primary)', lineHeight: 1.5, marginBottom: '14px' }}>
                "{activeQuestion.question}"
              </h2>

              <div style={{ background: 'var(--nxt-bg-surface-subtle)', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--nxt-border-subtle)' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--nxt-text-secondary)', fontWeight: 700, marginBottom: '4px' }}>
                  What the Bar-Raiser is looking for:
                </div>
                <div style={{ fontSize: '13px', color: 'var(--nxt-text-primary)' }}>
                  {activeQuestion.evaluation_criteria}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--nxt-text-secondary)' }}>
                    Your Executive STAR Answer:
                  </label>
                  <button
                    className="apple-btn apple-btn-ghost"
                    style={{ fontSize: '12px', padding: '2px 8px' }}
                    onClick={handleInsertSampleAnswer}
                  >
                    Insert Sample Answer
                  </button>
                </div>
                <textarea
                  className="apple-textarea"
                  style={{ minHeight: '140px', fontSize: '14px', lineHeight: 1.6 }}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Structure: Situation -> Task -> Action -> Result (with metrics)..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  id="evaluate-interview-btn"
                  className="apple-btn apple-btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleEvaluate}
                  disabled={evaluating || !userAnswer}
                >
                  {evaluating ? 'Evaluating STAR Breakdown...' : 'Submit for AI Evaluation'}
                  <Sparkles size={16} />
                </button>
              </div>
            </AppleCard>
          </div>

          {/* Right: Real-time Evaluation Card */}
          <div>
            {evaluation ? (
              <AppleCard glow style={{ padding: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <span className="apple-badge apple-badge-emerald">Evaluation Complete</span>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--nxt-text-primary)', marginTop: '4px' }}>
                      STAR Readiness Score
                    </h3>
                  </div>
                  <CircularGauge score={evaluation.overall_score || 88} size={90} strokeWidth={9} />
                </div>

                {/* STAR Breakdown Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
                  {['situation', 'task', 'action', 'result'].map((dim) => {
                    const score = evaluation.star_breakdown?.[`${dim}_score`] || 85;
                    return (
                      <div key={dim} style={{ background: 'var(--nxt-bg-surface-subtle)', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--nxt-border-subtle)' }}>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--nxt-text-secondary)' }}>{dim}</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--nxt-text-primary)' }}>{score}%</div>
                      </div>
                    );
                  })}
                </div>

                {/* Strengths */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--nxt-badge-emerald-text, #10b981)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    <ThumbsUp size={14} /> Strengths
                  </div>
                  {(evaluation.strengths || []).map((s, idx) => (
                    <div key={idx} style={{ fontSize: '13px', color: 'var(--nxt-text-primary)', marginBottom: '4px' }}>
                      • {s}
                    </div>
                  ))}
                </div>

                {/* Improvements */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--nxt-badge-amber-text, #f59e0b)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    <Lightbulb size={14} /> Coaching Tips
                  </div>
                  {(evaluation.improvements || []).map((imp, idx) => (
                    <div key={idx} style={{ fontSize: '13px', color: 'var(--nxt-text-secondary)', marginBottom: '4px' }}>
                      • {imp}
                    </div>
                  ))}
                </div>

                {/* Executive Model Answer */}
                {evaluation.executive_answer && (
                  <div style={{ background: 'var(--nxt-bg-surface-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--nxt-border-subtle)' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--nxt-accent-blue)', fontWeight: 700, marginBottom: '6px' }}>
                      Model 90-Second Executive Answer:
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--nxt-text-primary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                      "{evaluation.executive_answer}"
                    </div>
                  </div>
                )}
              </AppleCard>
            ) : (
              <AppleCard style={{ padding: '36px', textAlign: 'center', color: 'var(--nxt-text-secondary)' }}>
                <Mic size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--nxt-text-primary)', marginBottom: '6px' }}>
                  Awaiting Your Answer
                </div>
                <div style={{ fontSize: '13px', maxWidth: '280px', margin: '0 auto' }}>
                  Type your response or click "Insert Sample Answer" to test the AI evaluation grading in real time.
                </div>
              </AppleCard>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
