import { Component, ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { switchMap } from 'rxjs/operators';
import { List } from 'immutable';
import { ClipboardService } from 'ngx-clipboard';
import * as XLSX from 'xlsx';
import * as Mark from 'mark.js';

@Component({
  selector: 'app-agro-coordenadas-app',
  templateUrl: './agro-coordenadas-app.component.html',
  styleUrls: ['./agro-coordenadas-app.component.scss'],
})
export class AgroCoordenadasAppComponent {
  selectedPdfFile: File | null = null;
  responseTexts: string[] = [];
  results: FilterResult = {
    N: [],
    E: [],
    Latitude: [],
    Longitude: [],
  };
  LatResultString: string = '';
  LatResultStringRaw: string = '';
  LongResultString: string = '';
  LongResultStringRaw: string = '';
  NResultString: string = '';
  NResultStringRaw: string = '';
  EResultString: string = '';
  EResultStringRaw: string = '';
  isUploading: boolean = false;
  errorMessage: string | null = null;
  noFileSelectedWarning = false;

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj).filter((key) => obj[key] !== undefined);
  }

  constructor(
    private http: HttpClient,
    private clipboardService: ClipboardService
  ) {}
  @ViewChild('pesquisa') pesquisa!: ElementRef;
  @ViewChild('paragrafo') paragrafo!: ElementRef;

  marcar() {
    const keyword = this.pesquisa.nativeElement.value;
    const context = this.paragrafo.nativeElement;

    if (context) {
      const instance = new Mark(context);
      instance.unmark();
      instance.mark(keyword);
    }
  }

  private combineContent(): string {
    const eLines = this.EResultString.split('\n');
    const nLines = this.NResultString.split('\n');
    const longLines = this.LongResultString.split('\n');
    const latLines = this.LatResultString.split('\n');
    const combinedLines = [];
    const maxLines = Math.max(
      eLines.length,
      nLines.length,
      longLines.length,
      latLines.length
    );
    for (let i = 0; i < maxLines; i++) {
      const eLine = i < eLines.length ? eLines[i] : '';
      const nLine = i < nLines.length ? nLines[i] : '';
      const longLine = i < longLines.length ? longLines[i] : '';
      const latLine = i < latLines.length ? latLines[i] : '';
      if (nLine || eLine || latLine || longLine) {
        combinedLines.push(`${eLine}${nLine}${longLine}${latLine}`);
      }
    }
    return combinedLines.join('\n');
  }

  copyToClipboard() {
    const contentToCopy = this.combineContent();
    this.clipboardService.copyFromContent(contentToCopy);
  }

  saveToExcel() {
    const cellData = this.combineContent().split('\n');
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(
      cellData.map((line) => [line])
    );
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Planilha');
    XLSX.writeFile(wb, 'dados.xlsx');
  }

  clearResult(): void {
    this.NResultString = '';
    this.EResultString = '';
    this.LatResultString = '';
    this.LongResultString = '';
    this.responseTexts = [];
    this.isUploading = false;
  }

  private NFilterResult(data: FilterResult): string {
    const nArray = data.N || [];
    const maxItems = Math.max(nArray.length);
    let resultString = '';
    if (nArray.length > 0) {
      resultString = 'N\n';
      for (let i = 0; i < maxItems; i++) {
        const n = nArray[i] || '';
        const formattedN = this.FormatValueUtm(n);
        resultString += `${formattedN}\n`;
      }
    }
    return resultString;
  }

  private EFilterResult(data: FilterResult): string {
    const eArray = data.E || [];
    const maxItems = Math.max(eArray.length);
    let resultString = '';
    if (eArray.length > 0) {
      resultString = 'E;\n';
      for (let i = 0; i < maxItems; i++) {
        const e = eArray[i] || '';
        const formattedE = this.FormatValueUtm(e);
        resultString += `${formattedE};\n`;
      }
    }
    return resultString;
  }

  private LatFilterResult(data: FilterResult): string {
    const latitudeArray = data.Latitude || [];
    const maxItems = Math.max(latitudeArray.length);
    let resultString = '';
    if (latitudeArray.length > 0) {
      resultString = 'Latitude\n';
      for (let i = 0; i < maxItems; i++) {
        const latitude = latitudeArray[i] || '';
        const formattedLatitude = this.FormatValueLatLong(latitude);
        resultString += `${formattedLatitude}\n`;
      }
    }
    return resultString;
  }

  private LongFilterResult(data: FilterResult): string {
    const longitudeArray = data.Longitude || [];
    const maxItems = Math.max(longitudeArray.length);
    let resultString = '';
    if (longitudeArray.length > 0) {
      resultString = 'Longitude;\n';
      for (let i = 0; i < maxItems; i++) {
        const longitude = longitudeArray[i] || '';
        const formattedLongitude = this.FormatValueLatLong(longitude);
        resultString += `${formattedLongitude};\n`;
      }
    }
    return resultString;
  }

  public onFileSelected(event: any): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      this.selectedPdfFile = fileInput.files[0];
    }
  }
  public FormatValueUtm(value: string): string {
    let formattedValue = value;
    if (formattedValue.length > 4) {
      const lastFour = formattedValue.substring(formattedValue.length - 4);
      const everythingElse = formattedValue.substring(
        0,
        formattedValue.length - 4
      );
      const lastFourFormatted = lastFour.replace(/[.,]/g, ',');
      const everythingElseFormatted = everythingElse.replace(/[^\d]/g, '');
      formattedValue = everythingElseFormatted + lastFourFormatted;
    } else {
      formattedValue = formattedValue.replace(/[.,]/g, '').trimEnd();
    }
    return formattedValue;
  }

  public FormatValueLatLong(value: string): string {
    const formattedValue = value.replace(/\./g, ',');
    const finalFormattedValue = formattedValue.replace(/º/g, '°');
    return finalFormattedValue;
  }

  public upload(): void {
    if (this.selectedPdfFile) {
      this.isUploading = true;
      this.errorMessage = null;
      this.noFileSelectedWarning = false;
      const formData: FormData = new FormData();
      formData.append(
        'PdfFile',
        this.selectedPdfFile,
        this.selectedPdfFile.name
      );
      this.http
        .post<string[]>(
          'https://localhost:7168/api/Coordenadas/ExtracaoPdf',
          formData
        )
        .pipe(
          switchMap((response: string[]) => {
            console.log('File uploaded successfully');
            this.responseTexts = response;
            const formDataFilter: FormData = new FormData();
            return this.http.post<FilterResult>(
              'https://localhost:7168/api/Coordenadas/Filters',
              formDataFilter
            );
          })
        )
        .subscribe({
          next: (data: FilterResult) => {
            console.log('Filter applied successfully');
            this.results = data;
            this.LatResultStringRaw = data.Latitude.join(' ');
            this.LatResultString = this.LatFilterResult(data);
            this.LongResultStringRaw = data.Longitude.join(' ');
            this.LongResultString = this.LongFilterResult(data);
            this.NResultStringRaw = data.N.join(' ');
            this.NResultString = this.NFilterResult(data);
            this.EResultStringRaw = data.E.join(' ');
            this.EResultString = this.EFilterResult(data);
            this.isUploading = false;
          },
          error: (error: HttpErrorResponse) => {
            console.error('Error:', error);
            this.isUploading = false;
            this.errorMessage = 'erro back';
          },
        });
    } else {
      this.noFileSelectedWarning = true;
    }
  }
}

type FilterResult = {
  [key: string]: string[];
  N: string[];
  E: string[];
  Latitude: string[];
  Longitude: string[];
};
