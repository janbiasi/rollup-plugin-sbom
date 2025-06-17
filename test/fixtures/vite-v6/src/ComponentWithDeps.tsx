import { PropsWithChildren } from "react";
import { Button } from '@mui/base/Button';
import { formatDuration } from "date-fns";

console.warn('Duration:', formatDuration({
    years: 2,
    months: 9,
    weeks: 1,
    days: 7,
    hours: 5,
    minutes: 9,
    seconds: 30
}));

export function ComponentWithDeps({ children }: PropsWithChildren) {
    return (
        <Button>{children}</Button>
    );
}

ComponentWithDeps.displayName = "ComponentWithDeps";