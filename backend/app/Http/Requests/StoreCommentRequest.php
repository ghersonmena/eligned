<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommentRequest extends FormRequest
{
    /** Files a comment may carry: images, PDFs, Office documents, text and archives. */
    public const ALLOWED = 'jpg,jpeg,png,gif,webp,heic,pdf,doc,docx,xls,xlsx,ppt,pptx,odt,ods,odp,txt,csv,zip,rar,7z';

    public const MAX_FILES = 5;

    /** Per file, in kilobytes (10 MB). */
    public const MAX_KB = 10240;

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'body' => ['nullable', 'string', 'max:5000', 'required_without:attachments'],
            'attachments' => ['sometimes', 'array', 'max:'.self::MAX_FILES],
            'attachments.*' => ['file', 'max:'.self::MAX_KB, 'extensions:'.self::ALLOWED],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'body.required_without' => 'Escribe un comentario o adjunta un archivo.',
            'attachments.max' => 'Puedes adjuntar hasta '.self::MAX_FILES.' archivos por comentario.',
            'attachments.*.max' => 'Cada archivo puede pesar hasta 10 MB.',
            'attachments.*.extensions' => 'Ese tipo de archivo no se permite. Usa imágenes, PDF, documentos de Office, texto o ZIP.',
        ];
    }
}
