# Viva script — supervisor archive upload

This document captures the defense rationale for letting supervisors write
to the institutional archive in addition to admins. Read it once before
viva so you can give the answer crisply.

## The likely question

> "Why does the supervisor have archive upload? Isn't the archive supposed
> to be the administrator's responsibility?"

## The answer (memorise)

> "The supervisor archive upload mirrors UMaT institutional practice. The
> department administrator is the formal keeper of the archive, but in
> practice supervising lecturers physically hand over the bound final
> report to the registry. The system reflects that: the supervisor can
> submit the final approved PDF for their own students' projects only,
> and only after the final defense has passed. They cannot overwrite an
> existing archive — only the administrator can do that. This gives
> supervisors operational ownership of submission while preserving the
> administrator's role as the system of record."

## The follow-up question

> "What stops a rogue supervisor from archiving the wrong thing?"

## The follow-up answer

> "Three layers. First, the API endpoint verifies that the caller is the
> named supervisor on the project's `supervisor_id` field. Second, the
> project status must be `final_passed`, which is only reachable through
> the rubric-scored defense and the HoD's explicit pass decision.
> Third, supervisors cannot overwrite; only an administrator can replace
> an archive entry. This means even if a supervisor archives the wrong
> file, the administrator must be in the loop to correct it, providing
> audit and recovery."

## The deeper question

> "Doesn't this violate separation of concerns?"

## The deeper answer

> "It softens the separation deliberately. Pure role separation would say
> only administrators may write; but the trade-off is that supervisors
> would have to email PDFs to administrators, who then upload them
> manually. That re-introduces the very problem the abstract identifies —
> documents stored ad hoc, no audit trail, no integrity guarantees. By
> letting supervisors upload directly with strict guardrails, the system
> achieves the integrity goals of administrator-only archiving while
> reflecting how UMaT actually operates."

## Implementation summary for the methodology chapter

The supervisor archive upload endpoint enforces eligibility through three
checks performed in sequence: (1) the caller is authenticated and has
role `supervisor`; (2) the named `supervisor_id` on the target project
matches `auth.uid()`; (3) the project status is exactly `final_passed`,
preventing archival of in-progress, failed, or already-archived work.
The Supabase Storage policy widens write access from admin-only (Phase 3)
to admin-or-supervisor (Phase 3.1) as a defence-in-depth backstop;
primary enforcement remains at the API boundary. Supervisors cannot
update or delete existing archive entries — those remain administrator-only
to preserve auditability.
