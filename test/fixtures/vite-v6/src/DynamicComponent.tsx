import { RemoveScroll } from 'react-remove-scroll';

export function DynamicComponent() {
    return (
        <RemoveScroll>
            <div>
                <h1>Hello</h1>
            </div>
        </RemoveScroll>
    );
}

DynamicComponent.displayName = "DynamicComponent";