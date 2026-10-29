<?php

namespace Tests\Unit;

use App\Services\PublicDatasetSearch;
use PHPUnit\Framework\TestCase;

class PublicDatasetSearchTest extends TestCase
{
    public function test_original_terms_and_location_are_preserved_before_synonyms(): void
    {
        $terms = (new PublicDatasetSearch)->terms('jumlah sekolah di Kabupaten Wajo');

        $this->assertSame(['jumlah', 'sekolah', 'wajo'], array_slice($terms, 0, 3));
        $this->assertContains('pendidikan', $terms);
        $this->assertContains('siswa', $terms);
        $this->assertContains('total', $terms);
        $this->assertLessThanOrEqual(24, count($terms));
    }

    public function test_typo_fallback_generates_a_bounded_pattern_for_a_missing_letter(): void
    {
        $search = new PublicDatasetSearch;
        $method = new \ReflectionMethod($search, 'typoPatterns');
        $patterns = $method->invoke($search, 'sekolh');

        $this->assertContains('sekol_h', $patterns);
        $this->assertLessThanOrEqual(10, count($patterns));
    }

    public function test_independent_topics_expand_without_requiring_all_query_words(): void
    {
        $terms = (new PublicDatasetSearch)->terms('pendidikan dan kesehatan');

        $this->assertSame(['pendidikan', 'kesehatan'], array_slice($terms, 0, 2));
        $this->assertContains('sekolah', $terms);
        $this->assertContains('puskesmas', $terms);
        $this->assertContains('rumah sakit', $terms);
    }
}
