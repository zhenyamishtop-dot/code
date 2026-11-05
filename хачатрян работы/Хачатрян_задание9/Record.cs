using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Хачатрян_задание9
{
    // Данные об одном человеке: имя, дата рождения, должность, отдел, оклад.
    // DisplayName - это заголовок столбца, который DataGridView берет сам.
    public class Record
    {
        [DisplayName("Имя")]
        public String Name { get; set; }

        [DisplayName("Дата рождения")]
        public DateTime Birthday { get; set; }

        [DisplayName("Должность")]
        public String Profession { get; set; }

        [DisplayName("Отдел")]
        public String Department { get; set; }

        [DisplayName("Оклад")]
        public double Money { get; set; }

        // Конструктор по умолчанию.
        public Record()
        {
            Name = "";
            Birthday = DateTime.Today;
            Profession = "";
            Department = "";
            Money = 0;
        }

        // Конструктор с параметрами.
        public Record(String name, DateTime birthday, String profession, String department, double money)
        {
            Name = name;
            Birthday = birthday;
            Profession = profession;
            Department = department;
            Money = money;
        }

        public override string ToString()
        {
            return Name + ", " + Birthday.ToShortDateString() + " г.р., " + Profession +
                   ", " + Department + ", оклад " + Money + " руб.";
        }
    }
}
