import { useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { ScrollArea } from "../ui/scroll-area";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { FileText } from "lucide-react";

interface TermsAndConditionsModalProps {
  open: boolean;
  onClose: () => void;
  onAgree: () => void;
}

export function TermsAndConditionsModal({ open, onClose, onAgree }: TermsAndConditionsModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 40;
    if (atBottom) setHasScrolledToBottom(true);
  };

  const handleAgree = () => {
    onAgree();
    onClose();
  };

  const handleClose = () => {
    setAgreed(false);
    setHasScrolledToBottom(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <FileText className="w-5 h-5" />
            OWSC Membership Terms &amp; Conditions
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 overflow-y-auto max-h-[55vh]" onScrollCapture={handleScroll}>
          <div className="space-y-5 text-sm text-foreground leading-relaxed pr-2">

            <section>
              <h3 className="font-semibold text-primary mb-1">1. Membership Eligibility</h3>
              <p>
                Membership of the Old Wesleyites Sports Club (OWSC) is open to all former students of Wesley College,
                Colombo, and their immediate family members, subject to approval by the Club Administration. The Club
                reserves the right to accept or reject any application at its sole discretion.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-1">2. Membership Categories &amp; Fees</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Full Member</strong> — Rs. 15,000 per year. Full voting rights and access to all facilities.</li>
                <li><strong>Associate Member</strong> — Rs. 10,000 per year. Access to most facilities; no voting rights.</li>
                <li><strong>Sport Member</strong> — Rs. 5,000 per year. Access to sporting facilities only.</li>
                <li><strong>Social Member</strong> — Rs. 10,000 per year. Access to social and dining facilities.</li>
                <li><strong>Lifetime Member</strong> — Rs. 25,000 one-time payment. Permanent membership with full rights.</li>
              </ul>
              <p className="mt-2">
                All fees are non-refundable once the membership application has been approved. Annual fees are due on
                the 1st of January each year and must be settled within 30 days to maintain active membership status.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-1">3. Application &amp; Approval Process</h3>
              <p>
                All membership applications are subject to review and approval by the Club Administration. Submission
                of an application and payment of fees does not guarantee membership. Applicants will be notified of
                the outcome via the registered email address. The Club Administration may request additional
                documentation or information before making a decision.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-1">4. Member Conduct</h3>
              <p>
                Members are expected to conduct themselves in a manner befitting the values and traditions of OWSC at
                all times while on Club premises or representing the Club. The following are strictly prohibited:
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Disorderly, offensive, or abusive behaviour towards other members, guests, or staff.</li>
                <li>Damage to Club property or facilities.</li>
                <li>Bringing the Club into disrepute through actions inside or outside the Club.</li>
                <li>Unauthorised use of Club facilities or resources.</li>
              </ul>
              <p className="mt-2">
                Violations may result in suspension or permanent termination of membership without refund of fees.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-1">5. Use of Facilities</h3>
              <p>
                Members may use Club facilities in accordance with their membership category and the rules governing
                each facility. Facilities must be booked in advance where required. The Club reserves the right to
                close or restrict access to any facility for maintenance, events, or other operational reasons.
                Members are responsible for any guests they bring onto Club premises.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-1">6. Privacy &amp; Data Protection</h3>
              <p>
                Personal information collected during registration is used solely for the purpose of administering
                your membership and communicating Club-related information. Your data will not be shared with third
                parties without your consent, except where required by law. By registering, you consent to the Club
                storing and processing your personal data for these purposes.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-1">7. Payment &amp; Receipts</h3>
              <p>
                Members must provide a valid payment slip or bank transfer receipt at the time of application.
                Receipts will be verified by the Club Administration. Any fraudulent or altered payment documentation
                will result in immediate rejection of the application and may be reported to the relevant authorities.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-1">8. Termination of Membership</h3>
              <p>
                Membership may be terminated by the member at any time by written notice to the Club Administration.
                The Club may terminate membership for non-payment of fees, breach of Club rules, or conduct
                unbecoming of a member. No refund of fees will be issued upon termination.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-1">9. Amendments</h3>
              <p>
                The Club Administration reserves the right to amend these Terms &amp; Conditions at any time. Members
                will be notified of material changes via their registered email address. Continued use of Club
                facilities following notification of changes constitutes acceptance of the revised terms.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-primary mb-1">10. Governing Law</h3>
              <p>
                These Terms &amp; Conditions are governed by the laws of Sri Lanka. Any disputes arising from
                membership shall be subject to the exclusive jurisdiction of the courts of Sri Lanka.
              </p>
            </section>

            <p className="text-muted-foreground text-xs pt-2 border-t">
              Last updated: April 2026 &mdash; Old Wesleyites Sports Club, Colombo, Sri Lanka.
            </p>
          </div>
        </ScrollArea>

        <div className="pt-4 border-t space-y-4">
          {!hasScrolledToBottom && (
            <p className="text-xs text-muted-foreground text-center">
              Please scroll to the bottom to read all terms before agreeing.
            </p>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="modal-agree"
              checked={agreed}
              disabled={!hasScrolledToBottom}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <Label
              htmlFor="modal-agree"
              className={`text-sm cursor-pointer ${!hasScrolledToBottom ? "text-muted-foreground" : ""}`}
            >
              I have read and agree to the OWSC Membership Terms &amp; Conditions
            </Label>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleAgree}
              disabled={!agreed}
              className="flex-1 bg-primary text-white hover:bg-primary/90"
            >
              Agree &amp; Continue
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
