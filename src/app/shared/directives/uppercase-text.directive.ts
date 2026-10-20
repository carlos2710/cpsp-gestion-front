import { Directive, ElementRef, HostListener, inject } from '@angular/core';
import { NgControl } from '@angular/forms';

type TextFieldElement = HTMLInputElement | HTMLTextAreaElement;

@Directive({
  selector: 'input[formControlName]:not([type=email]):not([type=date]):not([type=time]):not([type=file]):not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=number]):not([readonly]), textarea[formControlName]',
  standalone: true
})
export class UppercaseTextDirective {
  private readonly element = inject(ElementRef<TextFieldElement>);
  private readonly ngControl = inject(NgControl, { self: true, optional: true });

  @HostListener('input')
  convertirAMayusculas(): void {
    const campo = this.element.nativeElement;
    const valorMayusculas = campo.value.toLocaleUpperCase('es-PE');
    if (campo.value === valorMayusculas) return;

    const inicio = campo.selectionStart;
    const fin = campo.selectionEnd;
    campo.value = valorMayusculas;
    this.ngControl?.control?.setValue(valorMayusculas, {
      emitEvent: false,
      emitModelToViewChange: false
    });
    if (inicio !== null && fin !== null) campo.setSelectionRange(inicio, fin);
  }
}
