import { Navigate, useParams } from "react-router";

/**
 * The suite studio route.
 *
 * The full studio page in this repository (and in the phase-0 checkpoint
 * archive) is truncated mid-file, so it cannot be restored verbatim. Rather
 * than render an empty canvas that pretends to be a working studio, this route
 * forwards to the real invitation editor, which owns the same design document
 * and the same save path.
 */
export default function Studio() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/invitations/${id}` : "/dashboard"} replace />;
}
