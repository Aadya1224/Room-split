import { useState } from 'react';
import { MessageSquare, Star, Sparkles } from 'lucide-react';
import { useSubmitFeedback } from '@/hooks/useAppFeatures';

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const submit = useSubmitFeedback();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    submit.mutate({ rating: rating || undefined, message: message.trim() }, { onSuccess: () => { setMessage(''); setRating(0); } });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white p-8 mb-6 shadow-lg">
        <div className="flex items-center gap-3 mb-3"><div className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center"><Sparkles className="h-5 w-5" /></div><span className="text-sm font-semibold uppercase tracking-wider text-white/80">Help us improve</span></div>
        <h1 className="text-3xl font-bold">Share your feedback</h1>
        <p className="mt-2 text-white/80 max-w-xl">Tell us what you like, what feels confusing, or what you want us to build next in RoomSplit.</p>
      </div>
      <form onSubmit={handleSubmit} className="card p-6 space-y-6">
        <div>
          <label className="label">How would you rate RoomSplit?</label>
          <div className="flex gap-2 mt-2">
            {[1,2,3,4,5].map((value) => <button type="button" key={value} onClick={() => setRating(value)} aria-label={`${value} stars`} className="p-1"><Star className={`h-7 w-7 transition ${value <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`} /></button>)}
          </div>
        </div>
        <div>
          <label className="label">Your feedback</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} maxLength={2000} placeholder="What can we improve?" className="input resize-none" required />
          <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/2000</p>
        </div>
        <button className="btn-primary btn-lg" disabled={submit.isPending || !message.trim()}><MessageSquare className="h-4 w-4" />{submit.isPending ? 'Sending...' : 'Send feedback'}</button>
      </form>
    </div>
  );
}
