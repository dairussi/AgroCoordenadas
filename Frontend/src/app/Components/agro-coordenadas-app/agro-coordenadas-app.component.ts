import { Component } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { switchMap } from 'rxjs/operators';
import { List } from 'immutable';
import { ClipboardService } from 'ngx-clipboard';
import * as XLSX from 'xlsx';

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
  LongResultString: string = '';
  NResultString: string = '';
  EResultString: string = '';
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

  private combineContent(): string {
    const nLines = this.NResultString.split('\n');
    const eLines = this.EResultString.split('\n');
    const latLines = this.LatResultString.split('\n');
    const longLines = this.LongResultString.split('\n');
    const combinedLines = [];
    const maxLines = Math.max(
      nLines.length,
      eLines.length,
      latLines.length,
      longLines.length
    );
    for (let i = 0; i < maxLines; i++) {
      const nLine = i < nLines.length ? nLines[i] : '';
      const eLine = i < eLines.length ? eLines[i] : '';
      const latLine = i < latLines.length ? latLines[i] : '';
      const longLine = i < longLines.length ? longLines[i] : '';
      if (nLine || eLine || latLine || longLine) {
        combinedLines.push(`${nLine}${eLine}${latLine}${longLine}`);
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
      resultString = 'N;\n';
      for (let i = 0; i < maxItems; i++) {
        const n = nArray[i] || '';
        resultString += `${n};\n`;
      }
    }
    return resultString;
  }

  private EFilterResult(data: FilterResult): string {
    const eArray = data.E || [];
    const maxItems = Math.max(eArray.length);
    let resultString = '';
    if (eArray.length > 0) {
      resultString = 'E\n';
      for (let i = 0; i < maxItems; i++) {
        const e = eArray[i] || '';
        resultString += `${e}\n`;
      }
    }
    return resultString;
  }

  private LatFilterResult(data: FilterResult): string {
    const latitudeArray = data.Latitude || [];
    const maxItems = Math.max(latitudeArray.length);
    let resultString = '';
    if (latitudeArray.length > 0) {
      resultString = 'Latitude;\n';
      for (let i = 0; i < maxItems; i++) {
        const latitude = latitudeArray[i] || '';
        resultString += `${latitude};\n`;
      }
    }
    return resultString;
  }

  private LongFilterResult(data: FilterResult): string {
    const longitudeArray = data.Longitude || [];
    const maxItems = Math.max(longitudeArray.length);
    let resultString = '';
    if (longitudeArray.length > 0) {
      resultString = 'Longitude\n';
      for (let i = 0; i < maxItems; i++) {
        const longitude = longitudeArray[i] || '';
        resultString += `${longitude}\n`;
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
            this.LatResultString = this.LatFilterResult(data);
            this.LongResultString = this.LongFilterResult(data);
            this.NResultString = this.NFilterResult(data);
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
