import { PropsWithChildren } from "react";
import { Button } from '@mui/base/Button';
import { formatDuration } from "date-fns";
import { DateTime } from "luxon";

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
    const dt = DateTime.now().reconfigure({ outputCalendar: "iso8601" });

    return (
        <>
        {dt.outputCalendar}
        {dt.toLocaleString({ month: 'long', day: 'numeric' })}
        <Button>{children}</Button>
        </>
    );
}

ComponentWithDeps.displayName = "ComponentWithDeps";
