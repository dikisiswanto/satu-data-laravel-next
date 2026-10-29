<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Relevance-oriented search for the public dataset catalogue.
 *
 * This deliberately uses portable SQL LIKE predicates instead of requiring an
 * external Elasticsearch service. The public API contract stays unchanged,
 * while synonyms and weighted ranking make natural-language queries useful.
 */
class PublicDatasetSearch
{
    private const STOP_WORDS = [
        'dan', 'atau', 'yang', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan',
        'ada', 'adalah', 'tentang', 'mengenai', 'di', 'kabupaten', 'kota',
        'provinsi', 'tolong', 'cari', 'carikan', 'tampilkan', 'menampilkan',
        'berapa', 'apa', 'saya', 'ingin', 'mau', 'data', 'dataset', 'informasi',
    ];

    /** @var array<string, list<string>> */
    private const INTENT_GROUPS = [
        'pendidikan' => ['sekolah', 'edukasi', 'siswa', 'murid', 'guru', 'peserta didik', 'madrasah', 'paud', 'sd', 'smp', 'sma', 'smk'],
        'sekolah' => ['pendidikan', 'edukasi', 'siswa', 'murid', 'guru', 'peserta didik', 'madrasah', 'paud', 'sd', 'smp', 'sma', 'smk'],
        'kesehatan' => ['rumah sakit', 'puskesmas', 'pasien', 'dokter', 'tenaga kesehatan', 'fasilitas kesehatan', 'penyakit', 'layanan kesehatan'],
        'penduduk' => ['kependudukan', 'populasi', 'demografi', 'warga', 'penduduk', 'jumlah penduduk', 'kelahiran', 'kematian'],
        'kependudukan' => ['penduduk', 'populasi', 'demografi', 'warga', 'kelahiran', 'kematian'],
        'kemiskinan' => ['miskin', 'kesejahteraan', 'bansos', 'bantuan sosial', 'kemiskinan ekstrem', 'pendapatan'],
        'ekonomi' => ['perekonomian', 'usaha', 'umkm', 'perdagangan', 'pendapatan', 'produk domestik', 'tenaga kerja'],
        'pertanian' => ['petani', 'perkebunan', 'peternakan', 'perikanan', 'pangan', 'produksi padi', 'lahan pertanian'],
        'lingkungan' => ['sampah', 'kebersihan', 'persampahan', 'hutan', 'limbah', 'kualitas air', 'iklim'],
        'infrastruktur' => ['jalan', 'jembatan', 'bangunan', 'fasilitas umum', 'irigasi', 'drainase', 'air bersih'],
        'transportasi' => ['angkutan', 'kendaraan', 'jalan', 'lalu lintas', 'terminal', 'pelabuhan'],
        'pariwisata' => ['wisata', 'destinasi', 'pengunjung', 'objek wisata', 'akomodasi'],
        'ketenagakerjaan' => ['tenaga kerja', 'pekerja', 'pengangguran', 'lapangan kerja', 'lowongan'],
        'bencana' => ['banjir', 'longsor', 'kebakaran', 'risiko bencana', 'kebencanaan'],
        'pemerintahan' => ['opd', 'dinas', 'instansi', 'perangkat daerah', 'administrasi pemerintahan', 'pelayanan publik', 'desa', 'kelurahan', 'kecamatan'],
        'keuangan' => ['anggaran', 'apbd', 'realisasi anggaran', 'belanja daerah', 'pendapatan daerah', 'pajak', 'retribusi', 'aset daerah', 'keuangan daerah'],
        'anggaran' => ['keuangan', 'apbd', 'realisasi anggaran', 'belanja daerah', 'pendapatan daerah', 'pajak', 'retribusi'],
        'sosial' => ['bansos', 'penyandang disabilitas', 'panti sosial', 'kemiskinan', 'perlindungan sosial', 'anak terlantar'],
        'perumahan' => ['permukiman', 'rumah layak huni', 'perumahan rakyat', 'sanitasi', 'air minum'],
        'kebudayaan' => ['budaya', 'cagar budaya', 'kesenian', 'adat', 'warisan budaya'],
        'olahraga' => ['atlet', 'sarana olahraga', 'prestasi olahraga', 'klub olahraga'],
        'perdagangan' => ['pasar', 'pedagang', 'harga pangan', 'distribusi barang', 'ekspor', 'impor'],
        'perikanan' => ['nelayan', 'ikan', 'budidaya ikan', 'hasil tangkapan', 'kelautan'],
        'pertanahan' => ['lahan', 'sertifikat tanah', 'agraria', 'tata ruang', 'penggunaan lahan'],
        'energi' => ['listrik', 'energi terbarukan', 'bahan bakar', 'penerangan jalan'],
        'teknologi' => ['informatika', 'internet', 'telekomunikasi', 'digitalisasi', 'sistem informasi'],
        'jumlah' => ['total', 'banyak', 'rekapitulasi', 'jumlah keseluruhan', 'statistik'],
        'statistik' => ['jumlah', 'total', 'indikator', 'rekapitulasi', 'data kuantitatif'],
    ];

    /** @return list<string> */
    public function terms(string $query): array
    {
        $tokens = $this->tokenize($query);
        // Keep every original word first. Synonyms must not crowd out a later
        // subject or place term in queries such as "jumlah sekolah Wajo".
        $terms = $tokens;
        $expansionGroups = [];

        foreach ($tokens as $token) {
            if (isset(self::INTENT_GROUPS[$token])) {
                $expansionGroups[] = $this->normalizeTerms(self::INTENT_GROUPS[$token]);

                continue;
            }

            foreach (self::INTENT_GROUPS as $intent => $relatedTerms) {
                $normalizedRelatedTerms = $this->normalizeTerms($relatedTerms);
                if (in_array($token, $normalizedRelatedTerms, true)) {
                    $expansionGroups[] = array_values(array_unique(array_merge([$intent], $normalizedRelatedTerms)));
                    break;
                }
            }
        }

        // Round-robin expansion lets multiple topics contribute aliases instead
        // of allowing the first topic to consume the whole query budget. Track
        // seen terms while adding so duplicate aliases do not waste that budget.
        $termBudget = max(24, count($tokens));
        $seen = array_fill_keys($terms, true);
        for ($position = 0; count($terms) < $termBudget; $position++) {
            $addedAtPosition = false;
            foreach ($expansionGroups as $group) {
                if (isset($group[$position]) && ! isset($seen[$group[$position]])) {
                    $term = $group[$position];
                    $terms[] = $term;
                    $seen[$term] = true;
                    $addedAtPosition = true;
                    if (count($terms) >= $termBudget) {
                        break;
                    }
                }
            }
            if (! $addedAtPosition) {
                break;
            }
        }

        return array_slice($terms, 0, $termBudget);
    }

    /** @return list<string> */
    private function tokenize(string $query): array
    {
        $normalized = Str::lower(Str::ascii($query));
        preg_match_all('/[a-z0-9]+/u', $normalized, $matches);

        return array_values(array_unique(array_filter(
            $matches[0] ?? [],
            fn (string $token): bool => mb_strlen($token) > 1 && ! in_array($token, self::STOP_WORDS, true)
        )));
    }

    /** @param list<string> $terms
     * @return list<string>
     */
    private function normalizeTerms(array $terms): array
    {
        return array_values(array_unique(array_filter(array_map(
            fn (string $term): string => Str::lower(Str::ascii(trim($term))),
            $terms
        ))));
    }

    /**
     * Produce a small, bounded set of one-edit SQL LIKE patterns. This is a
     * conservative fallback for common typos; short terms/numbers are excluded
     * to avoid excessive false positives. It is not a replacement for a search
     * engine with a real edit-distance ranking pipeline.
     *
     * @return list<string>
     */
    private function typoPatterns(string $token): array
    {
        $length = mb_strlen($token);
        if ($length < 5 || preg_match('/\d/', $token)) {
            return [];
        }

        $patterns = [];
        // Substitution: one unknown character at an interior position.
        $substitutionPositions = array_values(array_unique([
            1,
            (int) floor(($length - 1) / 2),
            $length - 2,
        ]));
        foreach ($substitutionPositions as $i) {
            if ($i > 0 && $i < $length - 1) {
                $patterns[] = substr($token, 0, $i).'_'.substr($token, $i + 1);
            }
        }

        // Missing character in the user's query: allow exactly one character
        // between adjacent query characters. Include the last boundary too.
        $insertionPositions = array_values(array_unique([
            1,
            (int) floor($length / 3),
            (int) floor((2 * $length) / 3),
            $length - 1,
        ]));
        foreach ($insertionPositions as $i) {
            if ($i > 0 && $i < $length) {
                $patterns[] = substr($token, 0, $i).'_'.substr($token, $i);
            }
        }

        // One extra character typed by the user.
        foreach ([1, (int) floor($length / 2), $length - 2] as $i) {
            if ($i > 0 && $i < $length - 1) {
                $patterns[] = substr($token, 0, $i).substr($token, $i + 1);
            }
        }

        return array_slice(array_values(array_unique($patterns)), 0, 10);
    }

    public function apply(Builder $builder, string $query, bool $rank = true): Builder
    {
        $query = trim($query);
        if ($query === '') {
            return $builder;
        }

        $terms = $this->terms($query);
        if ($terms === []) {
            $terms = [Str::lower(Str::ascii($query))];
        }

        $builder->where(function (Builder $outer) use ($terms, $query): void {
            $first = true;
            foreach ($terms as $term) {
                $pattern = $this->likePattern($term);
                $clause = function (Builder $where) use ($pattern): void {
                    $this->matchDirectFields($where, $pattern);
                    $where->orWhereHas('organization', function (Builder $organization) use ($pattern): void {
                        $organization->where(function (Builder $fields) use ($pattern): void {
                            foreach (['name', 'short_name', 'description', 'code', 'slug'] as $field) {
                                $fields->orWhereRaw("LOWER(organizations.{$field}) LIKE LOWER(?)", [$pattern]);
                            }
                        });
                    });
                    $where->orWhereExists(function ($metadata) use ($pattern): void {
                        $metadata->selectRaw('1')
                            ->from('dataset_sdi_metadata as search_metadata')
                            ->whereColumn('search_metadata.dataset_id', 'datasets.id')
                            ->whereColumn('search_metadata.dataset_version', 'datasets.current_version')
                            ->where(function ($fields) use ($pattern): void {
                                foreach ([
                                    'ddp_id', 'ddp_name', 'source_reference', 'sds_code', 'sds_type',
                                    'standard_concept', 'standard_definition', 'measurement',
                                    'reference_code', 'method_description',
                                ] as $field) {
                                    $fields->orWhereRaw("LOWER(search_metadata.{$field}) LIKE LOWER(?)", [$pattern]);
                                }
                                $fields->orWhereRaw('LOWER('.$this->castText('search_metadata.presentation_classification').') LIKE LOWER(?)', [$pattern]);
                                $fields->orWhereExists(function ($registry) use ($pattern): void {
                                    $registry->selectRaw('1')
                                        ->from('sdi_standard_registry as search_registry')
                                        ->whereColumn('search_registry.id', 'search_metadata.sds_registry_id')
                                        ->where(function ($registryFields) use ($pattern): void {
                                            foreach (['standard_code', 'title', 'definition', 'authority_name'] as $field) {
                                                $registryFields->orWhereRaw("LOWER(search_registry.{$field}) LIKE LOWER(?)", [$pattern]);
                                            }
                                        });
                                });
                                $fields->orWhereExists(function ($reference) use ($pattern): void {
                                    $reference->selectRaw('1')
                                        ->from('reference_code_systems as search_reference')
                                        ->whereColumn('search_reference.id', 'search_metadata.reference_system_id')
                                        ->where(function ($referenceFields) use ($pattern): void {
                                            foreach (['system_code', 'title', 'description', 'authority_name'] as $field) {
                                                $referenceFields->orWhereRaw("LOWER(search_reference.{$field}) LIKE LOWER(?)", [$pattern]);
                                            }
                                        });
                                });
                            });
                    });
                };
                if ($first) {
                    $outer->where($clause);
                    $first = false;
                } else {
                    $outer->orWhere($clause);
                }
            }

            // Conservative one-typo fallback for longer query words. Restrict it
            // to high-signal fields so a typo does not turn into a catalogue-wide hit.
            foreach (array_slice($this->tokenize($query), 0, 3) as $token) {
                foreach ($this->typoPatterns($token) as $fuzzyToken) {
                    $pattern = '%'.$fuzzyToken.'%';
                    $outer->orWhere(function (Builder $fuzzy) use ($pattern): void {
                        foreach (['datasets.title', 'datasets.category', 'datasets.description'] as $field) {
                            $fuzzy->orWhereRaw("LOWER({$field}) LIKE LOWER(?)", [$pattern]);
                        }
                        $fuzzy->orWhereRaw('LOWER('.$this->castText('datasets.keywords').') LIKE LOWER(?)', [$pattern]);
                        $fuzzy->orWhereExists(function ($organization) use ($pattern): void {
                            $organization->selectRaw('1')->from('organizations as fuzzy_org')
                                ->whereColumn('fuzzy_org.id', 'datasets.organization_id')
                                ->whereRaw('LOWER(fuzzy_org.name) LIKE LOWER(?)', [$pattern]);
                        });
                    });
                }
            }

            // Preserve phrase matching (especially titles) even when tokenization
            // removes connecting words from a natural-language question.
            $phrase = $this->likePattern(Str::lower(Str::ascii($query)));
            $outer->orWhereRaw('LOWER(datasets.title) LIKE LOWER(?)', [$phrase]);
        });

        if ($rank) {
            $this->orderByRelevance($builder, $query, $terms);
        }

        return $builder;
    }

    private function matchDirectFields(Builder $builder, string $pattern): void
    {
        $fields = [
            'datasets.title', 'datasets.code', 'datasets.slug', 'datasets.description',
            'datasets.category', 'datasets.source_name', 'datasets.source_url',
            'datasets.geographic_scope', 'datasets.update_frequency', 'datasets.methodology',
            'datasets.unit', 'datasets.license_text', 'datasets.contact',
        ];
        foreach ($fields as $field) {
            $builder->orWhereRaw("LOWER({$field}) LIKE LOWER(?)", [$pattern]);
        }
        $builder->orWhereRaw('LOWER('.$this->castText('datasets.keywords').') LIKE LOWER(?)', [$pattern]);
    }

    /** @param list<string> $terms */
    private function orderByRelevance(Builder $builder, string $query, array $terms): void
    {
        $phrase = $this->likePattern(Str::lower(Str::ascii($query)));
        $prefix = $this->likePattern(Str::lower(Str::ascii($query)), false);
        $builder->orderByRaw('CASE WHEN LOWER(datasets.title) = LOWER(?) THEN 0 WHEN LOWER(datasets.title) LIKE LOWER(?) THEN 1 WHEN LOWER(datasets.title) LIKE LOWER(?) THEN 2 ELSE 3 END', [Str::lower(Str::ascii($query)), $prefix, $phrase]);

        // Score the strongest metadata fields first. Correlated EXISTS predicates
        // avoid multiplying dataset rows through joins and preserve pagination.
        $scoreSql = [];
        $bindings = [];
        $originalTerms = $this->tokenize($query);
        foreach (array_slice($terms, 0, 20) as $term) {
            $pattern = $this->likePattern($term);
            $multiplier = in_array($term, $originalTerms, true) ? 3 : 1;
            foreach ([
                ['datasets.title', 12],
                ['datasets.category', 9],
                ['datasets.keywords', 10],
                ['datasets.source_name', 7],
                ['datasets.source_url', 4],
                ['datasets.geographic_scope', 6],
                ['datasets.update_frequency', 3],
                ['datasets.methodology', 5],
                ['datasets.unit', 3],
                ['datasets.license_text', 2],
                ['datasets.contact', 2],
                ['datasets.description', 4],
            ] as [$field, $weight]) {
                $expression = $field === 'datasets.keywords' ? $this->castText($field) : $field;
                $scoreSql[] = "CASE WHEN LOWER({$expression}) LIKE LOWER(?) THEN ".($weight * $multiplier).' ELSE 0 END';
                $bindings[] = $pattern;
            }
            $scoreSql[] = 'CASE WHEN EXISTS (SELECT 1 FROM organizations search_org WHERE search_org.id = datasets.organization_id AND (LOWER(search_org.name) LIKE LOWER(?) OR LOWER(search_org.short_name) LIKE LOWER(?) OR LOWER(search_org.description) LIKE LOWER(?))) THEN '.(8 * $multiplier).' ELSE 0 END';
            array_push($bindings, $pattern, $pattern, $pattern);
            $scoreSql[] = 'CASE WHEN EXISTS (SELECT 1 FROM dataset_sdi_metadata search_meta WHERE search_meta.dataset_id = datasets.id AND search_meta.dataset_version = datasets.current_version AND (LOWER(search_meta.ddp_name) LIKE LOWER(?) OR LOWER(search_meta.source_reference) LIKE LOWER(?) OR LOWER(search_meta.standard_concept) LIKE LOWER(?) OR LOWER(search_meta.standard_definition) LIKE LOWER(?) OR LOWER(search_meta.measurement) LIKE LOWER(?) OR LOWER(search_meta.method_description) LIKE LOWER(?) OR EXISTS (SELECT 1 FROM sdi_standard_registry search_registry WHERE search_registry.id = search_meta.sds_registry_id AND (LOWER(search_registry.standard_code) LIKE LOWER(?) OR LOWER(search_registry.title) LIKE LOWER(?) OR LOWER(search_registry.definition) LIKE LOWER(?) OR LOWER(search_registry.authority_name) LIKE LOWER(?))) OR EXISTS (SELECT 1 FROM reference_code_systems search_reference WHERE search_reference.id = search_meta.reference_system_id AND (LOWER(search_reference.system_code) LIKE LOWER(?) OR LOWER(search_reference.title) LIKE LOWER(?) OR LOWER(search_reference.description) LIKE LOWER(?) OR LOWER(search_reference.authority_name) LIKE LOWER(?)))) THEN '.(7 * $multiplier).' ELSE 0 END';
            array_push($bindings, $pattern, $pattern, $pattern, $pattern, $pattern, $pattern, $pattern, $pattern, $pattern, $pattern, $pattern, $pattern, $pattern, $pattern);
        }
        if ($scoreSql !== []) {
            $builder->orderByRaw('('.implode(' + ', $scoreSql).') DESC', $bindings);
        }
        $fuzzyScore = [];
        $fuzzyBindings = [];
        foreach (array_slice($originalTerms, 0, 3) as $token) {
            foreach ($this->typoPatterns($token) as $fuzzyToken) {
                $pattern = '%'.$fuzzyToken.'%';
                $fuzzyScore[] = 'CASE WHEN LOWER(datasets.title) LIKE LOWER(?) OR LOWER(datasets.category) LIKE LOWER(?) OR LOWER('.$this->castText('datasets.keywords').') LIKE LOWER(?) THEN 2 ELSE 0 END';
                array_push($fuzzyBindings, $pattern, $pattern, $pattern);
            }
        }
        if ($fuzzyScore !== []) {
            $builder->orderByRaw('('.implode(' + ', $fuzzyScore).') DESC', $fuzzyBindings);
        }
        $builder->orderByDesc('datasets.published_at')->orderBy('datasets.title');
    }

    private function castText(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'mysql', 'mariadb' => "CAST({$column} AS CHAR)",
            'pgsql' => "CAST({$column} AS TEXT)",
            default => "CAST({$column} AS TEXT)",
        };
    }

    private function likePattern(string $value, bool $contains = true): string
    {
        $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value);

        return ($contains ? '%' : '').$escaped.'%';
    }
}
