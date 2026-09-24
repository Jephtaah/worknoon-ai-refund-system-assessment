import { useEffect, useState } from 'react';
import { fetchAdminRequests } from '../api/client.js';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RefreshCw, Eye, AlertCircle } from 'lucide-react';

const REFRESH_MIN_DURATION_MS = 1000;

const DECISION_BADGE = {
  approved: { variant: 'default', label: 'Approved', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  denied: { variant: 'destructive', label: 'Denied', className: 'bg-red-100 text-red-800 border-red-300' },
  escalated: { variant: 'secondary', label: 'Escalated', className: 'bg-amber-100 text-amber-800 border-amber-300' },
};

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | done | error
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function fetchData() {
    try {
      const data = await fetchAdminRequests();
      setRequests(data);
      setStatus('done');
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  }

  async function handleRefresh() {
    setStatus('loading');
    try {
      const [data] = await Promise.all([
        fetchAdminRequests(),
        new Promise((resolve) => setTimeout(resolve, REFRESH_MIN_DURATION_MS)),
      ]);
      setRequests(data);
      setStatus('done');
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  }

  function handleRowClick(req) {
    setSelectedRequest(req);
    setIsModalOpen(true);
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Review customer refund requests, automated policy evaluations, and order details. Click any row for deep inspection.
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={status === 'loading'} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${status === 'loading' ? 'animate-spin' : ''}`} />
          {status === 'loading' ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {status === 'error' && (
        <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <Card className={`shadow-sm transition-opacity duration-200 ${status === 'loading' && requests.length > 0 ? 'opacity-75' : 'opacity-100'}`}>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-medium">Refund Audit Log</CardTitle>
            <CardDescription>Showing all evaluated refund requests sorted by most recent.</CardDescription>
          </div>
          {status === 'loading' && requests.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Refreshing data...</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {status === 'loading' && requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Loading requests...</div>
          ) : status === 'done' && requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No refund requests found.</div>
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Decision</TableHead>
                    <TableHead className="max-w-[280px]">Reasoning</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => {
                    const badgeConfig = DECISION_BADGE[r.decision] || { variant: 'outline', label: r.decision };
                    return (
                      <TableRow
                        key={r.id}
                        onClick={() => handleRowClick(r)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="font-medium">
                          <div>{r.customer?.name || r.customer_id}</div>
                          <div className="text-xs text-muted-foreground">{r.customer?.email}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.order_id}</TableCell>
                        <TableCell>{r.order?.item || 'Unknown Item'}</TableCell>
                        <TableCell>
                          <Badge variant={badgeConfig.variant} className={badgeConfig.className}>
                            {badgeConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate text-muted-foreground text-sm">
                          {r.reasoning}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs capitalize">
                            {r.source || 'system'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(r.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRowClick(r); }}>
                            <Eye className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complaint & Order Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg p-6 space-y-6">
          <DialogHeader className="space-y-1 pb-4 border-b border-border text-left pr-10">
            <div className="flex items-center gap-3 flex-wrap">
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Order <span className="font-mono font-medium">{selectedRequest?.order_id}</span>
              </DialogTitle>
              {selectedRequest && (
                <Badge variant={DECISION_BADGE[selectedRequest.decision]?.variant || 'outline'} className={`shrink-0 ${DECISION_BADGE[selectedRequest.decision]?.className || ''}`}>
                  {DECISION_BADGE[selectedRequest.decision]?.label || selectedRequest.decision}
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Evaluated by <span className="capitalize font-medium text-foreground">{selectedRequest?.source || 'system'}</span> on {selectedRequest?.timestamp ? new Date(selectedRequest.timestamp).toLocaleString() : 'N/A'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-5 text-sm">
              {/* Customer & Order Metadata Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-1">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Customer</div>
                  <div className="font-medium text-foreground">{selectedRequest.customer?.name || selectedRequest.customer_id}</div>
                  <div className="text-xs text-muted-foreground truncate">{selectedRequest.customer?.email}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Order Item</div>
                  <div className="font-medium text-foreground truncate">{selectedRequest.order?.item || 'N/A'}</div>
                  <div className="text-xs text-muted-foreground">
                    ${selectedRequest.order?.price?.toFixed(2) ?? 'N/A'} • {selectedRequest.order?.purchase_date || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Complaint Section */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Complaint</span>
                  <span className="text-xs font-medium text-foreground bg-muted px-2.5 py-0.5 rounded-full capitalize">
                    {selectedRequest.reason}
                  </span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed bg-muted/40 p-3.5 rounded-lg border border-border/40">
                  {selectedRequest.message}
                </p>
              </div>

              {/* AI Reasoning Section */}
              <div className="space-y-2 pt-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">AI Reasoning</div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedRequest.reasoning}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="-mx-6 -mb-6 mt-6 px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
