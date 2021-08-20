export = Odometer;
declare class Odometer {
    static init(): any;
    constructor(options: any);
    options: any;
    el: any;
    MAX_VALUES: number;
    value: number;
    renderInside(): any;
    inside: HTMLDivElement;
    watchForMutations(): void;
    observer: MutationObserver;
    watchMutations: boolean;
    startWatchingMutations(): void;
    stopWatchingMutations(): void;
    cleanValue(val: any): number;
    bindTransitionEnd(): any[];
    transitionEndBound: boolean;
    resetFormat(): {
        repeating: string;
        radix: string;
        precision: number;
        fractional: number;
    };
    format: {
        repeating: string;
        radix: string;
        precision: number;
        fractional: number;
    };
    render(value?: number): void;
    ribbons: {};
    formatDigits(value: any): void;
    digits: any[];
    update(newValue: any): any;
    renderDigit(): Element;
    insertDigit(digit: any, before: any): any;
    addSpacer(chr: any, before: any, ...extraClasses: any[]): any;
    addDigit(value: any, repeating?: boolean): any;
    animate(newValue: any): any;
    animateCount(newValue: any): any;
    getDigitCount(...values: any[]): number;
    getFractionalDigitCount(...values: any[]): number;
    resetDigits(): {
        repeating: string;
        radix: string;
        precision: number;
        fractional: number;
    };
    animateSlide(newValue: any): any;
}
declare namespace Odometer {
    const options: any;
}
