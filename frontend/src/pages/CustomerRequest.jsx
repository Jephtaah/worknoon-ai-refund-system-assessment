import { useState } from 'react';
import { submitRefundRequest } from '../api/client.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, Loader2, Send } from 'lucide-react';

const DECISION_CONFIG = {
  approved: { label: 'Approved', variant: 'default', icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  denied: { label: 'Denied', variant: 'destructive', icon: AlertCircle, color: 'bg-red-50 text-red-700 border-red-200' },
  escalated: { label: 'Escalated for Review', variant: 'secondary', icon: Clock, color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const REFUND_REASONS = [
  'Item arrived damaged',
  'Received the wrong item',
  "Item doesn't match the description",
  'Item arrived late',
  'Changed my mind',
  'Other',
];

export default function CustomerRequest() {
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');
    try {
      const response = await submitRefundRequest({
        order_id: orderId.trim(),
        reason,
        message: message.trim(),
      });
      setResult(response);
      setStatus('done');
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  }

  function handleReset() {
    setOrderId('');
    setReason('');
    setMessage('');
    setStatus('idle');
    setResult(null);
    setErrorMessage('');
  }

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-medium tracking-tight mb-2">Request a Refund</h1>
        <p className="text-muted-foreground text-sm">
          Submit your order details and reason for return. Our automated policy engine will evaluate your request instantly.
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Order & Issue Details</CardTitle>
            <CardDescription>Provide your order ID and describe the issue you experienced.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderId">Order Number</Label>
                <Input
                  id="orderId"
                  placeholder="e.g., ORD-1007"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Refund</Label>
                <select
                  id="reason"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Select a reason
                  </option>
                  {REFUND_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 mb-4">
                <Label htmlFor="message">Describe the Issue</Label>
                <Textarea
                  id="message"
                  placeholder="Provide specific details about why you are requesting a refund..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                />
              </div>

              {status === 'error' && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between px-6 py-4 bg-muted/20">
              <Button type="button" variant="outline" onClick={handleReset} disabled={status === 'loading'}>
                Clear Form
              </Button>
              <Button type="submit" disabled={status === 'loading'}>
                {status === 'loading' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {status === 'done' && result && (
          <Card className={`shadow-sm border ${DECISION_CONFIG[result.decision]?.color || 'bg-card'}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  {result.decision === 'approved' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                  {result.decision === 'denied' && <AlertCircle className="w-5 h-5 text-red-600" />}
                  {result.decision === 'escalated' && <Clock className="w-5 h-5 text-amber-600" />}
                  Evaluation Result: <span className="capitalize">{result.decision}</span>
                </CardTitle>
                <Badge variant={DECISION_CONFIG[result.decision]?.variant || 'outline'}>
                  Source: {result.source || 'policy engine'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reasoning</span>
                <p className="text-sm mt-1">{result.reasoning}</p>
              </div>
              {result.policy_checks && result.policy_checks.length > 0 && (
                <div>
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Policy Checks</span>
                  <div className="mt-2 space-y-1">
                    {result.policy_checks.map((chk, i) => (
                      <div key={i} className={`text-xs flex items-center justify-between bg-background/80 p-2 rounded border ${
                        result.decision === 'approved' ? 'border-emerald-200' :
                        result.decision === 'denied' ? 'border-red-200' :
                        'border-amber-200'
                      }`}>
                        <span className="font-medium font-mono">{chk.rule}</span>
                        <Badge variant={chk.result === 'pass' ? 'outline' : 'destructive'} className="text-[10px]">
                          {chk.result}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className={`border-t px-6 py-3 bg-background/50 ${
              result.decision === 'approved' ? 'border-emerald-200' :
              result.decision === 'denied' ? 'border-red-200' :
              'border-amber-200'
            }`}>
              <Button variant="outline" size="sm" onClick={handleReset} className="w-full">
                Submit Another Request
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
