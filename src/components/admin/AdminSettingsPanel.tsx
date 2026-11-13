import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import { isValidMobile, normalizeMobile } from '@/lib/phone';
import { supabase } from '@/lib/supabase';
import { cardClass, inputClass, labelClass } from '@/lib/styles';
import type { PaymentNumbers } from '@/lib/types';

export default function AdminSettingsPanel() {
  const [jazzcash, setJazzcash] = useState('');
  const [easypaisa, setEasypaisa] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('jazzcash_number, easypaisa_number')
        .eq('id', 1)
        .maybeSingle();
      if (!active) return;
      setLoading(false);
      if (error || !data) {
        setMessage({ type: 'error', text: 'Settings load nahi ho sakin.' });
        return;
      }
      const settings = data as PaymentNumbers;
      setJazzcash(settings.jazzcash_number);
      setEasypaisa(settings.easypaisa_number);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const jc = normalizeMobile(jazzcash);
    const ep = normalizeMobile(easypaisa);
    if (!isValidMobile(jc) || !isValidMobile(ep)) {
      setMessage({ type: 'error', text: 'Dono numbers 03XXXXXXXXX format mein hon (11 digits).' });
      return;
    }
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from('admin_settings')
      .update({ jazzcash_number: jc, easypaisa_number: ep, updated_at: new Date().toISOString() })
      .eq('id', 1);
    setSaving(false);
    if (error) {
      setMessage({ type: 'error', text: 'Save nahi ho saka. Dobara koshish karein.' });
      return;
    }
    setJazzcash(jc);
    setEasypaisa(ep);
    setMessage({ type: 'success', text: 'Numbers save ho gaye. Players ko ab naye numbers dikhein gay.' });
  };

  return (
    <section className={cardClass}>
      <h2 className="text-xl font-extrabold text-stone-900">Payment Numbers</h2>
      <p className="mt-1 text-sm text-stone-600">Ye numbers Coins Kharidne wale page par players ko dikhein ge.</p>

      {loading ? (
        <p className="mt-6 text-stone-500">Settings load ho rahi hain...</p>
      ) : (
        <form onSubmit={handleSave} className="mt-6 space-y-5" noValidate>
          <div>
            <label htmlFor="jazzcash" className={labelClass}>JazzCash Number</label>
            <input id="jazzcash" inputMode="numeric" value={jazzcash} onChange={(e) => setJazzcash(e.target.value)} placeholder="03XXXXXXXXX" className={inputClass} />
          </div>
          <div>
            <label htmlFor="easypaisa" className={labelClass}>Easypaisa Number</label>
            <input id="easypaisa" inputMode="numeric" value={easypaisa} onChange={(e) => setEasypaisa(e.target.value)} placeholder="03XXXXXXXXX" className={inputClass} />
          </div>

          {message && (
            <p role="status" className={`rounded-xl px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </p>
          )}

          <Button type="submit" loading={saving}>
            <Save className="h-4 w-4" /> Save Karein
          </Button>
        </form>
      )}
    </section>
  );
}
