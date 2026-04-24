import React, { useMemo, useState } from 'react';
import { ImagePlus, Search, ZoomIn, ZoomOut } from 'lucide-react';

const ZOOM_LEVELS = [0.85, 1, 1.15, 1.3, 1.45];
const DEFAULT_ZOOM = 1.15;
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function scaleRect(rect, scale) {
  return {
    left: `${rect.x * scale}px`,
    top: `${rect.y * scale}px`,
    width: `${rect.w * scale}px`,
    height: `${rect.h * scale}px`,
  };
}

function resolveFieldValue(field, form) {
  if (typeof field.read === 'function') {
    return field.read(form);
  }
  return field.key ? form[field.key] ?? '' : '';
}

function fieldBaseStyle(field, scale) {
  const lineHeight = field.lineHeight
    ? (field.lineHeight > 3
        ? field.lineHeight * scale
        : (field.fontSize || 9) * field.lineHeight * scale)
    : undefined;

  return {
    ...scaleRect(field, scale),
    fontSize: `${(field.fontSize || 9) * scale}px`,
    textAlign: field.align || 'left',
    lineHeight: lineHeight ? `${lineHeight}px` : undefined,
  };
}

function textInputClass(isReadOnly) {
  return [
    'absolute rounded-md px-1.5 py-0.5 text-gray-900 placeholder:text-gray-400',
    'border border-transparent bg-transparent outline-none transition-all',
    isReadOnly ? 'pointer-events-none' : 'focus:border-primary-400 focus:bg-white/35 hover:border-primary-200',
  ].join(' ');
}

function parseDateParts(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return { year: '', month: '', day: '', weekday: '' };
  }

  const matched = raw.match(/(\d{4})[-./년\s]?(\d{1,2})[-./월\s]?(\d{1,2})/);
  let year = '';
  let month = '';
  let day = '';

  if (matched) {
    [, year, month, day] = matched;
    month = String(Number(month));
    day = String(Number(day));
  }

  const date = new Date(raw);
  const weekday = Number.isNaN(date.getTime()) ? '' : WEEKDAY_LABELS[date.getDay()];

  return {
    year,
    month,
    day,
    weekday,
  };
}

function resolveDateInputRect(field) {
  if (field.inputRect) {
    return field.inputRect;
  }

  if (!Array.isArray(field.parts) || field.parts.length === 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  const xValues = field.parts.map((part) => part.x);
  const yValues = field.parts.map((part) => part.y);
  const maxX = Math.max(...field.parts.map((part) => part.x + part.w));
  const maxY = Math.max(...field.parts.map((part) => part.y + part.h));

  return {
    x: Math.min(...xValues),
    y: Math.min(...yValues),
    w: maxX - Math.min(...xValues),
    h: maxY - Math.min(...yValues),
  };
}

function OfficialTextField({ field, form, setField, scale }) {
  const value = resolveFieldValue(field, form);
  const style = fieldBaseStyle(field, scale);

  if (field.readOnly || !field.key) {
    return (
      <div
        className="absolute overflow-hidden whitespace-pre-wrap px-1.5 py-0.5 text-gray-900"
        style={style}
      >
        {value}
      </div>
    );
  }

  if (field.control === 'select') {
    return (
      <select
        value={form[field.key] || ''}
        onChange={(event) => setField(field.key, event.target.value)}
        className={textInputClass(false)}
        style={style}
      >
        {(field.options || []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      type={field.inputType || 'text'}
      value={form[field.key] || ''}
      onChange={(event) => setField(field.key, event.target.value)}
      className={textInputClass(false)}
      style={style}
      placeholder={field.placeholder || ''}
    />
  );
}

function OfficialMultilineField({ field, form, setField, scale }) {
  const value = resolveFieldValue(field, form);
  const style = fieldBaseStyle(field, scale);

  if (field.readOnly || !field.key) {
    return (
      <div
        className="absolute overflow-hidden whitespace-pre-wrap px-1.5 py-1 text-gray-900"
        style={style}
      >
        {value}
      </div>
    );
  }

  return (
    <textarea
      value={form[field.key] || ''}
      onChange={(event) => setField(field.key, event.target.value)}
      className="absolute resize-none rounded-md border border-transparent bg-transparent px-1.5 py-1 text-gray-900 outline-none transition-all hover:border-primary-200 focus:border-primary-400 focus:bg-white/35"
      style={style}
      rows={3}
      placeholder={field.placeholder || ''}
    />
  );
}

function OfficialDatePartsField({ field, form, setField, scale }) {
  const rect = resolveDateInputRect(field);
  const parts = parseDateParts(form[field.key]);

  return (
    <>
      <input
        type="date"
        value={form[field.key] || ''}
        onChange={(event) => setField(field.key, event.target.value)}
        className="absolute cursor-pointer opacity-0"
        style={scaleRect(rect, scale)}
        aria-label={field.label || field.key}
      />
      {field.parts.map((part) => (
        <div
          key={`${field.id}-${part.part}`}
          className="absolute overflow-hidden whitespace-nowrap text-gray-900"
          style={{
            ...scaleRect(part, scale),
            fontSize: `${(part.fontSize || field.fontSize || 9) * scale}px`,
            textAlign: part.align || field.align || 'center',
            lineHeight: `${(part.lineHeight || part.h || 14) * scale}px`,
            paddingLeft: `${(part.padding ?? field.padding ?? 1.5) * scale}px`,
            paddingRight: `${(part.padding ?? field.padding ?? 1.5) * scale}px`,
          }}
        >
          {parts[part.part] || ''}
        </div>
      ))}
    </>
  );
}

function OfficialCheckboxGroup({ field, form, setField, scale }) {
  const selected = form[field.key] || '';

  return (
    <>
      {field.options.map((option) => {
        const active = selected === option.value;
        return (
          <button
            key={`${field.id}-${option.value}`}
            type="button"
            onClick={() => setField(field.key, option.value)}
            className={`absolute rounded-md border transition-colors ${
              active
                ? 'border-primary-500 bg-primary-100/60'
                : 'border-transparent hover:border-primary-200 hover:bg-white/20'
            }`}
            style={{
              left: `${option.x * scale}px`,
              top: `${option.y * scale}px`,
              width: `${option.w * scale}px`,
              height: `${option.h * scale}px`,
            }}
            title={option.value}
          >
            {active && (
              <span
                className="absolute rounded-sm bg-primary-600"
                style={{
                  left: `${(option.markX - option.x - 2) * scale}px`,
                  top: `${(option.markY - option.y - 5) * scale}px`,
                  width: `${6 * scale}px`,
                  height: `${6 * scale}px`,
                }}
              />
            )}
          </button>
        );
      })}
    </>
  );
}

function OfficialTableRowsField({ field, form, setTableCellValue, resolveRowDefaults, scale }) {
  const rows = Array.isArray(form[field.listKey]) ? form[field.listKey] : [];
  const startIndex = field.startIndex || 0;
  const visibleRows = field.rowSlots.map((slot, visibleIndex) => {
    const absoluteIndex = startIndex + visibleIndex;
    const row = rows[absoluteIndex] || resolveRowDefaults(field, absoluteIndex);
    return {
      slot,
      row,
      absoluteIndex,
    };
  });

  return (
    <>
      {visibleRows.flatMap(({ slot, row, absoluteIndex }) => (
        field.columns.map((column) => (
          <input
            key={`${field.id}-${absoluteIndex}-${column.key}`}
            type="text"
            value={row?.[column.key] || ''}
            onChange={(event) => setTableCellValue(field, absoluteIndex, column.key, event.target.value)}
            className="absolute rounded-sm border border-transparent bg-transparent px-1 py-0 text-gray-900 outline-none transition-all hover:border-primary-200 focus:border-primary-400 focus:bg-white/35"
            style={{
              left: `${column.x * scale}px`,
              top: `${slot.y * scale}px`,
              width: `${column.w * scale}px`,
              height: `${slot.h * scale}px`,
              fontSize: `${(column.fontSize || field.fontSize || 7.6) * scale}px`,
              textAlign: column.align || 'left',
            }}
          />
        ))
      ))}
      {rows.length > startIndex + field.rowSlots.length && (
        <div
          className="absolute rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
          style={{ right: '18px', bottom: '16px' }}
        >
          추가 행 {rows.length - (startIndex + field.rowSlots.length)}건은 연속기록으로 내보냅니다.
        </div>
      )}
    </>
  );
}

function LegacyOfficialImageSlots({ field, previews, onRequestPhotoUpload }) {
  return (
    <>
      {field.slots.map((slot, index) => {
        const preview = previews[index];

        return (
          <button
            key={`${field.id}-${slot.x}-${slot.y}`}
            type="button"
            onClick={onRequestPhotoUpload}
            className="absolute overflow-hidden rounded-md border border-dashed border-gray-300 bg-white/40 transition-colors hover:border-primary-400 hover:bg-white/60"
            style={{
              left: `${slot.x}px`,
              top: `${slot.y}px`,
              width: `${slot.w}px`,
              height: `${slot.h}px`,
            }}
          >
            {preview ? (
              <img src={preview.src} alt={`첨부 사진 ${index + 1}`} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-gray-500">
                <ImagePlus size={16} />
                사진 추가
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

function OfficialImageSlots({ field, previews, onRequestPhotoUpload, scale }) {
  return (
    <>
      {field.slots.map((slot, index) => {
        const preview = previews[index];

        return (
          <button
            key={`${field.id}-${slot.x}-${slot.y}`}
            type="button"
            onClick={onRequestPhotoUpload}
            className="absolute overflow-hidden rounded-md border border-dashed border-gray-300 bg-white/40 transition-colors hover:border-primary-400 hover:bg-white/60"
            style={scaleRect(slot, scale)}
          >
            {preview ? (
              <img src={preview.src} alt={`첨부 사진 ${index + 1}`} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-gray-500">
                <ImagePlus size={16} />
                사진 추가
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

function PageFieldRenderer({
  field,
  form,
  setField,
  setTableCellValue,
  resolveRowDefaults,
  photoAssignments,
  onRequestPhotoUpload,
  scale,
}) {
  if (field.type === 'text') {
    return <OfficialTextField field={field} form={form} setField={setField} scale={scale} />;
  }

  if (field.type === 'multiline') {
    return <OfficialMultilineField field={field} form={form} setField={setField} scale={scale} />;
  }

  if (field.type === 'dateParts') {
    return <OfficialDatePartsField field={field} form={form} setField={setField} scale={scale} />;
  }

  if (field.type === 'checkboxGroup') {
    return <OfficialCheckboxGroup field={field} form={form} setField={setField} scale={scale} />;
  }

  if (field.type === 'tableRows') {
    return (
      <OfficialTableRowsField
        field={field}
        form={form}
        setTableCellValue={setTableCellValue}
        resolveRowDefaults={resolveRowDefaults}
        scale={scale}
      />
    );
  }

  if (field.type === 'imageSlots') {
    return (
      <OfficialImageSlots
        field={field}
        previews={photoAssignments[field.id] || []}
        onRequestPhotoUpload={onRequestPhotoUpload}
        scale={scale}
      />
    );
  }

  return null;
}

export default function OfficialFormCanvas({
  schema,
  form,
  setField,
  setTableCellValue,
  resolveRowDefaults,
  photoPreviews,
  onRequestPhotoUpload,
}) {
  const [zoomIndex, setZoomIndex] = useState(ZOOM_LEVELS.indexOf(DEFAULT_ZOOM));
  const zoom = ZOOM_LEVELS[zoomIndex >= 0 ? zoomIndex : 0];
  const photoAssignments = useMemo(() => {
    const assignments = {};
    let cursor = 0;

    schema.pages.forEach((currentPage) => {
      currentPage.fields
        .filter((field) => field.type === 'imageSlots')
        .forEach((field) => {
          assignments[field.id] = photoPreviews.slice(cursor, cursor + field.slots.length);
          cursor += field.slots.length;
        });
    });

    return assignments;
  }, [photoPreviews, schema.pages]);

  return (
    <div className="overflow-x-auto pb-2">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          배경 위에 바로 입력하면 같은 좌표로 공식양식 PDF가 생성됩니다.
        </p>
        <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1">
          <Search size={14} className="text-gray-400" />
          <button
            type="button"
            onClick={() => setZoomIndex((current) => Math.max(0, current - 1))}
            disabled={zoomIndex === 0}
            className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40"
            aria-label="축소"
          >
            <ZoomOut size={14} />
          </button>
          <span className="min-w-[56px] text-center text-xs font-medium text-gray-700">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoomIndex((current) => Math.min(ZOOM_LEVELS.length - 1, current + 1))}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-40"
            aria-label="확대"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>
      <div className="min-w-fit space-y-8">
        {schema.pages.map((currentPage, pageIndex) => (
          <section key={currentPage.id} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-gray-900">
                {schema.label} {schema.pages.length > 1 ? `${pageIndex + 1}페이지` : ''}
              </p>
              <span className="text-xs text-gray-500">
                {currentPage.id.includes('first-half') && '상반기'}
                {currentPage.id.includes('second-half') && '하반기'}
              </span>
            </div>
            <div
              className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
              style={{ width: `${currentPage.width * zoom}px`, height: `${currentPage.height * zoom}px` }}
            >
              <img
                src={`${import.meta.env.BASE_URL}${currentPage.backgroundPath}`}
                alt={`${schema.label} 배경`}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
              <div className="absolute inset-0">
                {currentPage.fields.map((field) => (
                  <PageFieldRenderer
                    key={field.id}
                    field={field}
                    form={form}
                    setField={setField}
                    setTableCellValue={setTableCellValue}
                    resolveRowDefaults={resolveRowDefaults}
                    photoAssignments={photoAssignments}
                    onRequestPhotoUpload={onRequestPhotoUpload}
                    scale={zoom}
                  />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
